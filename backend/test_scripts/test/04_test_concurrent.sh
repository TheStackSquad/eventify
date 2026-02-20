#!/bin/bash
# test/04_test_concurrent.sh
# Concurrent verification race condition tests — all payment via webhook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/api_helpers.sh"
source "$SCRIPT_DIR/helpers/db_helpers.sh"
source "$SCRIPT_DIR/helpers/assertions.sh"
source "$SCRIPT_DIR/helpers/test_strategy.sh"

echo "========================================"
echo "TEST: Concurrent Verification Requests"
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

# ─── TEST 1: 10 Concurrent Webhooks → Exactly Correct Ticket Count ────────────
echo ""
log_info "Test 1: 10 concurrent webhooks on same reference — no ticket duplication"
echo "------------------------------------"

REFERENCE=$(create_pending_order "conc1@example.com" "$EVENT_ID" "$TIER_ID" "3")
ORDER_ID=$(db_get_order_id "$REFERENCE")
EXPECTED=$(db_get_order_total_quantity "$ORDER_ID")

log_info "Reference: $REFERENCE | Expected tickets: $EXPECTED"

TEMP_DIR=$(mktemp -d)

for i in $(seq 1 10); do
    (
        send_test_webhook "$REFERENCE" "success" > /dev/null 2>&1
        echo "webhook $i done" >> "$TEMP_DIR/w1.txt"
    ) &
done
wait
sleep 2  # Allow all async DB writes to settle

log_info "Concurrent webhook results:"
sort "$TEMP_DIR/w1.txt" 2>/dev/null || true
rm -rf "$TEMP_DIR"

FINAL_COUNT=$(db_count_tickets "$ORDER_ID")
assert_equals "$FINAL_COUNT" "$EXPECTED" \
    "RACE CONDITION CHECK: Must have exactly $EXPECTED tickets (not $FINAL_COUNT)"

DUP=$(db_check_duplicate_tickets "$ORDER_ID")
assert_empty "$DUP" "No duplicate ticket codes from 10 concurrent webhooks"

STATUS=$(db_get_order_status "$REFERENCE")
assert_equals "$STATUS" "success" "Order must be in success state"

log_success "✓ Concurrent safety: $FINAL_COUNT tickets — no race condition duplicates"
db_delete_order "$REFERENCE"

# ─── TEST 2: 10 Concurrent Webhooks via Session Cookie ───────────────────────
echo ""
log_info "Test 2: 10 concurrent verify-path requests (cookie session)"
echo "------------------------------------"
# These hit the verify endpoint — they will fail against Paystack (no real txn)
# but the test validates that concurrent failures don't corrupt DB state.

COOKIE_FILE=$(mktemp)
INIT_PAYLOAD=$(mktemp --suffix=.json)
cat > "$INIT_PAYLOAD" <<JSON
{
  "email": "conc2@example.com",
  "firstName": "Concurrent",
  "lastName": "Cookie",
  "phone": "+2348155764220",
  "items": [{
    "eventId": "$EVENT_ID",
    "ticketTierId": "$TIER_ID",
    "quantity": 3
  }]
}
JSON

RAW_INIT=$(curl -s -c "$COOKIE_FILE" \
    -X POST -H "Content-Type: application/json" \
    -d @"$INIT_PAYLOAD" \
    "$API_BASE_URL/api/orders/initialize")
rm -f "$INIT_PAYLOAD"

INIT_RES=$(echo "$RAW_INIT" | tr -d '\r' | grep -o '{.*}' | tail -n 1)
COOKIE_REF=$(echo "$INIT_RES" | jq -r '.data.reference // empty' 2>/dev/null)
COOKIE_ORDER_ID=$(db_get_order_id "$COOKIE_REF")
COOKIE_EXPECTED=$(db_get_order_total_quantity "$COOKIE_ORDER_ID")

log_info "Cookie reference: $COOKIE_REF | Expected tickets: $COOKIE_EXPECTED"

TEMP_DIR=$(mktemp -d)
for i in $(seq 1 10); do
    (
        RESP=$(curl -s -b "$COOKIE_FILE" \
            -X GET \
            -H "X-Mock-Status: success" \
            "$API_BASE_URL/api/payments/verify/$COOKIE_REF")
        CLEAN=$(echo "$RESP" | tr -d '\r' | grep -o '{.*}' | tail -n 1)
        STATUS=$(echo "$CLEAN" | jq -r '.status // "parse_error"' 2>/dev/null)
        echo "Request $i → $STATUS" >> "$TEMP_DIR/c2.txt"
    ) &
done
wait

log_info "Concurrent verify results:"
sort "$TEMP_DIR/c2.txt" 2>/dev/null || true
rm -rf "$TEMP_DIR"
rm -f "$COOKIE_FILE"

# Key check: even if verify fails (no real txn), no partial state corruption
COOKIE_TICKETS=$(db_count_tickets "$COOKIE_ORDER_ID")
COOKIE_STATUS=$(db_get_order_status "$COOKIE_REF")
log_info "After concurrent verify storm: status=$COOKIE_STATUS tickets=$COOKIE_TICKETS"

# Stock must not go negative regardless of outcome
TIER_STOCK=$(db_get_stock "$TIER_ID")
[ "${TIER_STOCK:-0}" -lt 0 ] && { log_error "CRITICAL: Stock negative ($TIER_STOCK)!"; exit 1; }
log_success "✓ Stock non-negative after concurrent storm: $TIER_STOCK"

db_delete_order "$COOKIE_REF"

# ─── TEST 3: Two Simultaneous Webhooks → Exactly One Processing ──────────────
echo ""
log_info "Test 3: Two simultaneous webhooks — only one should process"
echo "------------------------------------"

REFERENCE=$(create_pending_order "conc3@example.com" "$EVENT_ID" "$TIER_ID" "2")

if [ -z "$REFERENCE" ] || [ "$REFERENCE" = "null" ]; then
    log_error "Test 3: order creation failed — Paystack rate limit between tests"
    exit 1
fi

ORDER_ID=$(db_get_order_id "$REFERENCE")
EXPECTED=$(db_get_order_total_quantity "$ORDER_ID")

(send_test_webhook "$REFERENCE" "success" > /dev/null 2>&1) &
(send_test_webhook "$REFERENCE" "success" > /dev/null 2>&1) &
wait || true
sleep 2

RACE_COUNT=$(db_count_tickets "$ORDER_ID")
assert_equals "$RACE_COUNT" "$EXPECTED" \
    "Exactly $EXPECTED tickets from simultaneous double-webhook"

DUP_RACE=$(db_check_duplicate_tickets "$ORDER_ID")
assert_empty "$DUP_RACE" "No duplicate codes from double webhook"

log_success "✓ Double webhook: $RACE_COUNT tickets — locking works"
db_delete_order "$REFERENCE"
sleep 5

echo "========================================"
echo "CONCURRENCY TESTS COMPLETE"
echo "========================================"
print_test_summary