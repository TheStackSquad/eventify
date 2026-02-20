#!/bin/bash
# test/03_test_idempotency.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/api_helpers.sh"
source "$SCRIPT_DIR/helpers/db_helpers.sh"
source "$SCRIPT_DIR/helpers/assertions.sh"
source "$SCRIPT_DIR/helpers/test_strategy.sh"

echo "========================================"
echo "TEST: Idempotency & Race Conditions"
echo "========================================"

db_check_connection || exit 1

EVENT_ID="d568878a-3187-4642-89af-a5a87190b65d"
TIER_ID="3011f1ba-530e-43a6-a686-2f3b0c4ad0f5"

TIER_AVAILABLE=$(db_get_stock "$TIER_ID")
if [ -z "$TIER_AVAILABLE" ] || [ "$TIER_AVAILABLE" -lt 20 ]; then
    EVENT_ID=$(db_query "SELECT id FROM events WHERE is_deleted = false LIMIT 1" | head -n 1 | tr -d '[:space:]')
    TIER_ID=$(db_query "SELECT id FROM ticket_tiers WHERE event_id = '$EVENT_ID' AND available BETWEEN 5 AND 9 ORDER BY available DESC LIMIT 1" | head -n 1 | tr -d '[:space:]')
fi

if [ -z "$TIER_ID" ]; then
    log_error "No tier with sufficient stock found. Run: UPDATE ticket_tiers SET sold=0, available=capacity WHERE event_id='$EVENT_ID';"
    exit 1
fi

log_info "Event: $EVENT_ID | Tier: $TIER_ID"

# ─── TEST 1: 10 Sequential Webhooks ──────────────────────────────────────────
echo ""
log_info "Test 1: 10 sequential webhook calls — no ticket duplication"
echo "------------------------------------"

REFERENCE=$(create_pending_order "idem1@example.com" "$EVENT_ID" "$TIER_ID" "2")
ORDER_ID=$(db_get_order_id "$REFERENCE")
EXPECTED=$(db_get_order_total_quantity "$ORDER_ID")
log_info "Reference: $REFERENCE | Expected tickets: $EXPECTED"

send_test_webhook "$REFERENCE" "success" > /dev/null; sleep 1

AFTER_FIRST=$(db_count_tickets "$ORDER_ID")
assert_equals "$AFTER_FIRST" "$EXPECTED" "First webhook creates correct tickets"
assert_db_order_status "$REFERENCE" "success" "Status is success after first webhook"

for i in $(seq 2 10); do
    send_test_webhook "$REFERENCE" "success" > /dev/null; sleep 0.3
done

FINAL_COUNT=$(db_count_tickets "$ORDER_ID")
assert_equals "$FINAL_COUNT" "$EXPECTED" "Ticket count unchanged after 10 webhooks: $FINAL_COUNT"
assert_empty "$(db_check_duplicate_tickets "$ORDER_ID")" "No duplicate codes after 10 sequential webhooks"
log_success "✓ Sequential idempotency: $FINAL_COUNT tickets stable across 10 webhook calls"
db_delete_order "$REFERENCE"

# ─── TEST 2: 5 Concurrent Webhooks ───────────────────────────────────────────
echo ""
log_info "Test 2: 5 concurrent webhooks on same reference"
echo "------------------------------------"

REFERENCE=$(create_pending_order "idem2@example.com" "$EVENT_ID" "$TIER_ID" "3")
ORDER_ID=$(db_get_order_id "$REFERENCE")
EXPECTED=$(db_get_order_total_quantity "$ORDER_ID")
log_info "Reference: $REFERENCE | Expected tickets: $EXPECTED"

TEMP_DIR=$(mktemp -d)
for i in $(seq 1 5); do
    (send_test_webhook "$REFERENCE" "success" > /dev/null 2>&1 && echo "webhook $i sent" >> "$TEMP_DIR/r.txt") &
done
wait; sleep 2

log_info "Concurrent results:"; cat "$TEMP_DIR/r.txt" 2>/dev/null || true; rm -rf "$TEMP_DIR"

CONCURRENT_COUNT=$(db_count_tickets "$ORDER_ID")
assert_equals "$CONCURRENT_COUNT" "$EXPECTED" "RACE CONDITION: Must have exactly $EXPECTED tickets (got $CONCURRENT_COUNT)"
assert_empty "$(db_check_duplicate_tickets "$ORDER_ID")" "No duplicate codes from concurrent webhooks"
assert_db_order_status "$REFERENCE" "success" "Order in success state after concurrent storm"
log_success "✓ Concurrent safety: $CONCURRENT_COUNT tickets — no race condition"
db_delete_order "$REFERENCE"

# ─── TEST 3: Two Simultaneous Webhooks ───────────────────────────────────────
echo ""
log_info "Test 3: Two webhooks fire simultaneously — only one processes"
echo "------------------------------------"

REFERENCE=$(create_pending_order "idem3@example.com" "$EVENT_ID" "$TIER_ID" "2")
ORDER_ID=$(db_get_order_id "$REFERENCE")
EXPECTED=$(db_get_order_total_quantity "$ORDER_ID")

(send_test_webhook "$REFERENCE" "success" > /dev/null 2>&1) &
(send_test_webhook "$REFERENCE" "success" > /dev/null 2>&1) &
wait; sleep 2

assert_db_order_status "$REFERENCE" "success" "Order must reach success state"
assert_equals "$(db_count_tickets "$ORDER_ID")" "$EXPECTED" "Exactly $EXPECTED tickets — no race duplication"
assert_empty "$(db_check_duplicate_tickets "$ORDER_ID")" "No duplicate codes"
log_success "✓ Simultaneous webhook race: $EXPECTED tickets — locking works"
db_delete_order "$REFERENCE"

# ─── TEST 4: Transaction Atomicity ───────────────────────────────────────────
echo ""
log_info "Test 4: Transaction atomicity — all fields update together"
echo "------------------------------------"
# NOTE: This backend uses reserve-on-init.
# Stock (available) is decremented when the order is created, NOT when payment completes.
# So we capture BASELINE_STOCK *before* creating the order.
# After webhook: tickets created, status=success, sold increases, available already moved.

TIER_ID_ATOMICITY=$(db_query "SELECT id FROM ticket_tiers WHERE id = '$TIER_ID'" | head -n 1 | tr -d '[:space:]')
BASELINE_STOCK=$(db_get_stock "$TIER_ID_ATOMICITY")
BASELINE_SOLD=$(db_get_sold "$TIER_ID_ATOMICITY")
log_info "Baseline (before order): stock=$BASELINE_STOCK sold=$BASELINE_SOLD"

REFERENCE=$(create_pending_order "idem4@example.com" "$EVENT_ID" "$TIER_ID" "3")
ORDER_ID=$(db_get_order_id "$REFERENCE")

# Confirm reserve-on-init: stock should already be down by 3
AFTER_INIT_STOCK=$(db_get_stock "$TIER_ID_ATOMICITY")
log_info "After init (before webhook): stock=$AFTER_INIT_STOCK (expected $(( BASELINE_STOCK - 3 )))"
assert_equals "$AFTER_INIT_STOCK" "$(( BASELINE_STOCK - 3 ))" "Reserve-on-init: stock reserved at order creation"

PRE_WEBHOOK_STATUS=$(db_get_order_status "$REFERENCE")
PRE_WEBHOOK_TICKETS=$(db_count_tickets "$ORDER_ID")
log_info "Before webhook: status=$PRE_WEBHOOK_STATUS tickets=$PRE_WEBHOOK_TICKETS"

complete_order_via_webhook "$REFERENCE"

POST_STATUS=$(db_get_order_status "$REFERENCE")
POST_TICKETS=$(db_count_tickets "$ORDER_ID")
POST_STOCK=$(db_get_stock "$TIER_ID_ATOMICITY")
POST_SOLD=$(db_get_sold "$TIER_ID_ATOMICITY")
log_info "After webhook: status=$POST_STATUS tickets=$POST_TICKETS stock=$POST_STOCK sold=$POST_SOLD"

assert_equals "$POST_STATUS" "success" "Status → success"
assert_equals "$POST_TICKETS" "3" "3 tickets created"

# Stock was reserved at init — webhook does NOT move it again
assert_equals "$POST_STOCK" "$AFTER_INIT_STOCK" "Stock unchanged by webhook (already reserved at init)"

# But sold count DOES increase when payment completes
assert_equals "$POST_SOLD" "$(( BASELINE_SOLD + 3 ))" "Sold increased by 3 after webhook"

CAPACITY=$(db_query "SELECT capacity FROM ticket_tiers WHERE id = '$TIER_ID_ATOMICITY'" | head -n 1 | tr -d '[:space:]')
assert_equals "$(( POST_STOCK + POST_SOLD ))" "$CAPACITY" "capacity = sold + available invariant"

if [ "$POST_STATUS" = "success" ] && [ "${POST_TICKETS:-0}" -eq 0 ]; then
    log_error "CRITICAL: Order marked success but zero tickets — partial commit!"
    exit 1
fi

log_success "✓ Atomicity verified (reserve-on-init design confirmed)"
db_delete_order "$REFERENCE"

# ─── TEST 5: Oversell Race ────────────────────────────────────────────────────
echo ""
log_info "Test 5: Oversell race — stock never goes negative"
echo "------------------------------------"

OVERSELL_TIER_ID="ef4e162d-1c8e-4d07-b010-0e45c8c40110"
AVAILABLE=$(db_get_stock "$OVERSELL_TIER_ID")
ORDERS_TO_TRY=$(( AVAILABLE + 2 ))
log_info "Stock: $AVAILABLE | Attempting: $ORDERS_TO_TRY orders"

CREATED_REFS=()
for i in $(seq 1 "$ORDERS_TO_TRY"); do
    TMPFILE=$(mktemp --suffix=.json)
 cat > "$TMPFILE" <<JSON
{"email":"oversell${i}@example.com","firstName":"O","lastName":"S${i}","phone":"+2348155764220","items":[{"eventId":"$EVENT_ID","ticketTierId":"$OVERSELL_TIER_ID","quantity":1}]}
JSON
    RAW=$(throttled_init_order "$TMPFILE") || true; rm -f "$TMPFILE"
    RESP=$(echo "$RAW" | grep -o '{.*}' | tail -n 1 | tr -d '\r')
    if [ "$(extract_json "$RESP" "status")" = "success" ]; then
        REF=$(echo "$RESP" | jq -r '.data.reference // empty' 2>/dev/null)
        CREATED_REFS+=("$REF")
        log_info "  Order $i created: $REF"
    else
        log_info "  Order $i rejected (expected after stock exhaustion)"
    fi
done

FINAL_STOCK=$(db_get_stock "$OVERSELL_TIER_ID")
[ "${FINAL_STOCK:-0}" -lt 0 ] && { log_error "CRITICAL: Stock negative ($FINAL_STOCK)!"; exit 1; }
log_success "✓ Stock non-negative: $FINAL_STOCK"

for REF in "${CREATED_REFS[@]}"; do [ -n "$REF" ] && db_delete_order "$REF"; done

echo ""
print_test_summary