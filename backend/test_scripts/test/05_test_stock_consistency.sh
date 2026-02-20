#!/bin/bash
# test/05_test_stock_consistency.sh
# Stock management — reduction, invariants, oversell prevention

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/api_helpers.sh"
source "$SCRIPT_DIR/helpers/db_helpers.sh"
source "$SCRIPT_DIR/helpers/assertions.sh"
source "$SCRIPT_DIR/helpers/test_strategy.sh"

echo "========================================"
echo "TEST: Stock Consistency & Management"
echo "========================================"

db_check_connection || exit 1

EVENT_ID="d568878a-3187-4642-89af-a5a87190b65d"
TIER_ID="3011f1ba-530e-43a6-a686-2f3b0c4ad0f5"

TIER_AVAILABLE=$(db_get_stock "$TIER_ID")
if [ -z "$TIER_AVAILABLE" ] || [ "$TIER_AVAILABLE" -lt 20 ]; then
    EVENT_ID=$(db_query "SELECT id FROM events WHERE is_deleted = false LIMIT 1" | head -n 1 | tr -d '[:space:]')
    TIER_ID=$(db_query "SELECT id FROM ticket_tiers WHERE event_id = '$EVENT_ID' AND available > 5 LIMIT 1" | head -n 1 | tr -d '[:space:]')
fi

if [ -z "$TIER_ID" ]; then
    log_error "No tier with sufficient stock found. Run: UPDATE ticket_tiers SET sold=0, available=capacity WHERE event_id='$EVENT_ID';"
    exit 1
fi

log_info "Event: $EVENT_ID | Tier: $TIER_ID"

# ─── TEST 1: Stock Reduces After Successful Payment ───────────────────────────
echo ""
log_info "Test 1: Stock reduces correctly after webhook payment"
echo "------------------------------------"

INITIAL_STOCK=$(db_get_stock "$TIER_ID")
INITIAL_SOLD=$(db_get_sold "$TIER_ID")
CAPACITY=$(db_query "SELECT capacity FROM ticket_tiers WHERE id = '$TIER_ID'" | head -n 1 | tr -d '[:space:]')
QUANTITY=3

log_info "Initial: available=$INITIAL_STOCK sold=$INITIAL_SOLD capacity=$CAPACITY"

REFERENCE=$(create_pending_order "stock1@example.com" "$EVENT_ID" "$TIER_ID" "$QUANTITY")
ORDER_ID=$(db_get_order_id "$REFERENCE")

# Complete via webhook — real service path, no SQL hacks
complete_order_via_webhook "$REFERENCE"

FINAL_STOCK=$(db_get_stock "$TIER_ID")
FINAL_SOLD=$(db_get_sold "$TIER_ID")

log_info "Final:   available=$FINAL_STOCK sold=$FINAL_SOLD"

assert_equals "$FINAL_STOCK" "$(( INITIAL_STOCK - QUANTITY ))" "Stock decreased by $QUANTITY"
assert_equals "$FINAL_SOLD" "$(( INITIAL_SOLD + QUANTITY ))" "Sold increased by $QUANTITY"

# Invariant
assert_equals "$(( FINAL_STOCK + FINAL_SOLD ))" "$CAPACITY" "capacity = sold + available"

log_success "✓ Stock: $INITIAL_STOCK → $FINAL_STOCK | Sold: $INITIAL_SOLD → $FINAL_SOLD"
db_delete_order "$REFERENCE"

# ─── TEST 2: Pending Order — Stock Behavior ───────────────────────────────────
echo ""
log_info "Test 2: Pending order stock behavior"
echo "------------------------------------"

BEFORE=$(db_get_stock "$TIER_ID")

REFERENCE=$(create_pending_order "stock2@example.com" "$EVENT_ID" "$TIER_ID" "2")
AFTER=$(db_get_stock "$TIER_ID")

log_info "Stock before=$BEFORE after_pending=$AFTER"

if [ "$AFTER" = "$BEFORE" ]; then
    log_success "✓ Reserve-on-payment: stock unchanged for pending order"
elif [ "$AFTER" = "$(( BEFORE - 2 ))" ]; then
    log_success "✓ Reserve-on-init: stock reserved at order creation ($BEFORE → $AFTER)"
else
    log_error "Unexpected stock delta: before=$BEFORE after=$AFTER"
fi

db_delete_order "$REFERENCE"

# ─── TEST 3: Sequential Orders — Each Reduces Stock Correctly ────────────────
echo ""
log_info "Test 3: Sequential orders each reduce stock by correct amount"
echo "------------------------------------"

BASELINE=$(db_get_stock "$TIER_ID")
log_info "Baseline: $BASELINE"

SEQ_REFS=()
for i in 1 2 3; do
    REF=$(create_pending_order "seq${i}@example.com" "$EVENT_ID" "$TIER_ID" "1")
    complete_order_via_webhook "$REF"
    CURRENT=$(db_get_stock "$TIER_ID")
    EXPECTED=$(( BASELINE - i ))
    log_info "  After order $i: stock=$CURRENT (expected $EXPECTED)"
    assert_equals "$CURRENT" "$EXPECTED" "Stock after order $i"
    SEQ_REFS+=("$REF")
done

log_success "✓ Sequential reduction verified across 3 orders"
for REF in "${SEQ_REFS[@]}"; do db_delete_order "$REF"; done

# ─── TEST 4: Oversell Prevention ─────────────────────────────────────────────
echo ""
log_info "Test 4: API prevents order exceeding available stock"
echo "------------------------------------"

CURRENT_STOCK=$(db_get_stock "$TIER_ID")
TMPFILE=$(mktemp --suffix=.json)
cat > "$TMPFILE" <<JSON
{
  "email": "oversell@example.com",
  "firstName": "Over", "lastName": "Sell",
  "items": [{"eventId": "$EVENT_ID", "ticketTierId": "$TIER_ID", "quantity": $(( CURRENT_STOCK + 100 ))}]
}
JSON

RAW=$(throttled_init_order "$TMPFILE")
rm -f "$TMPFILE"
RESP=$(echo "$RAW" | grep -o '{.*}' | tail -n 1 | tr -d '\r')
STATUS=$(extract_json "$RESP" "status")

if [ "$STATUS" != "success" ]; then
    log_success "✓ Oversell rejected (qty=$(( CURRENT_STOCK + 100 )), available=$CURRENT_STOCK)"
else
    log_error "API allowed oversell order!"
    REF=$(echo "$RESP" | jq -r '.data.reference // empty' 2>/dev/null)
    [ -n "$REF" ] && db_delete_order "$REF"
fi

POST_OVERSELL=$(db_get_stock "$TIER_ID")
[ "${POST_OVERSELL:-0}" -lt 0 ] && { log_error "CRITICAL: Stock negative ($POST_OVERSELL)!"; exit 1; }
log_success "✓ Stock remains non-negative: $POST_OVERSELL"

# ─── TEST 5: Final Consistency — capacity = sold + available ─────────────────
echo ""
log_info "Test 5: Final stock integrity check across all tiers for this event"
echo "------------------------------------"

INCONSISTENT=$(db_query "
    SELECT id, name, capacity, sold, available,
           (capacity - sold - available) AS drift
    FROM ticket_tiers
    WHERE event_id = '$EVENT_ID'
      AND available != (capacity - sold)
")

if [ -z "$INCONSISTENT" ]; then
    log_success "✓ All tiers consistent: capacity = sold + available"
else
    log_error "Stock inconsistency detected:"
    echo "$INCONSISTENT"
    exit 1
fi

# ─── TEST 6: Free Ticket (price = 0) ─────────────────────────────────────────
echo ""
log_info "Test 6: Free ticket tier (price_kobo = 0)"
echo "------------------------------------"

FREE_TIER=$(db_query "SELECT id, event_id FROM ticket_tiers WHERE price_kobo = 0 AND available > 0 LIMIT 1" | head -n 1)
FREE_TIER_ID=$(echo "$FREE_TIER" | awk '{print $1}' | tr -d '[:space:]')
FREE_EVENT_ID=$(echo "$FREE_TIER" | awk '{print $2}' | tr -d '[:space:]')

if [ -n "$FREE_TIER_ID" ]; then
    TMPFILE=$(mktemp --suffix=.json)
    cat > "$TMPFILE" <<JSON
{
  "email": "freetix@example.com",
  "firstName": "Free", "lastName": "Ticket",
  "items": [{"eventId": "$FREE_EVENT_ID", "ticketTierId": "$FREE_TIER_ID", "quantity": 1}]
}
JSON
    RAW=$(throttled_init_order "$TMPFILE")
    rm -f "$TMPFILE"
    RESP=$(echo "$RAW" | grep -o '{.*}' | tail -n 1 | tr -d '\r')
    STATUS=$(extract_json "$RESP" "status")

    if [ "$STATUS" = "success" ]; then
        FREE_REF=$(echo "$RESP" | jq -r '.data.reference // empty' 2>/dev/null)
        FREE_TOTAL=$(db_query "SELECT final_total FROM orders WHERE reference = '$FREE_REF'" | head -n 1 | tr -d '[:space:]')
        log_info "Free ticket final_total: $FREE_TOTAL kobo"
        [ "${FREE_TOTAL:-0}" -eq 0 ] && log_success "✓ Free ticket total is 0" \
            || log_info "ℹ Free ticket has service fee: $FREE_TOTAL kobo (may be by design)"
        db_delete_order "$FREE_REF"
    else
        log_warning "Free ticket order failed: $RESP"
    fi
else
    log_warning "Skipped: no free tier (price_kobo=0) found"
fi

echo ""
print_test_summary