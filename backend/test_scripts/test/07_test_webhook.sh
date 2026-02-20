#!/bin/bash
# test/07_test_webhook.sh
# Full webhook integration test — create order, sign + send webhook, verify all DB state
# RESERVE-ON-INIT: stock is reserved when order is created, not when webhook fires.
# Stock assertion must compare against BASELINE captured BEFORE order creation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/api_helpers.sh"
source "$SCRIPT_DIR/helpers/db_helpers.sh"
source "$SCRIPT_DIR/helpers/assertions.sh"
source "$SCRIPT_DIR/helpers/test_strategy.sh"

echo "========================================"
echo "TEST: Paystack Webhook Integration"
echo "========================================"

db_check_connection || exit 1

VALID_EVENT_ID="d568878a-3187-4642-89af-a5a87190b65d"
VALID_TIER_ID="3011f1ba-530e-43a6-a686-2f3b0c4ad0f5"

TIER_STOCK=$(db_get_stock "$VALID_TIER_ID")
if [ -z "$TIER_STOCK" ] || [ "$TIER_STOCK" -lt 5 ]; then
    log_warning "Primary tier low/unavailable — falling back to DB query"
    VALID_EVENT_ID=$(db_query "SELECT id FROM events WHERE is_deleted = false LIMIT 1" | head -n 1 | tr -d '[:space:]')
    VALID_TIER_ID=$(db_query "SELECT id FROM ticket_tiers WHERE event_id = '$VALID_EVENT_ID' AND available > 5 LIMIT 1" | head -n 1 | tr -d '[:space:]')
fi

if [ -z "$VALID_EVENT_ID" ] || [ -z "$VALID_TIER_ID" ]; then
    log_error "No valid event/tier found."
    exit 1
fi

log_info "Event: $VALID_EVENT_ID | Tier: $VALID_TIER_ID"

# ─── CAPTURE BASELINE BEFORE ORDER CREATION ───────────────────────────────────
# CRITICAL: Must read stock BEFORE init_order because this backend uses
# reserve-on-init. The order creation itself decrements available.
BASELINE_STOCK=$(db_get_stock "$VALID_TIER_ID")
BASELINE_SOLD=$(db_get_sold "$VALID_TIER_ID")
log_info "Baseline: available=$BASELINE_STOCK sold=$BASELINE_SOLD"

# ─── STEP 1: Create Order ──────────────────────────────────────────────────────
log_info ""
log_info "Step 1: Creating order to be fulfilled via webhook..."

TMPFILE=$(mktemp --suffix=.json)
cat > "$TMPFILE" <<JSON
{
  "email": "webhook_integration@example.com",
  "firstName": "Webhook",
  "lastName": "Integration",
  "phone": "+2348155764220",
  "items": [{
    "eventId": "$VALID_EVENT_ID",
    "ticketTierId": "$VALID_TIER_ID",
    "quantity": 2
  }]
}
JSON

RAW_INIT=$(throttled_init_order "$TMPFILE")
rm -f "$TMPFILE"

INIT_RES=$(echo "$RAW_INIT" | grep -o '{.*}' | tail -n 1 | tr -d '\r')
REFERENCE=$(echo "$INIT_RES" | jq -r '.data.reference // empty' 2>/dev/null)

if [ -z "$REFERENCE" ] || [ "$REFERENCE" = "null" ]; then
    log_error "Order creation failed. Response: $INIT_RES"
    exit 1
fi

ORDER_ID=$(db_get_order_id "$REFERENCE")
EXPECTED_TICKETS=$(db_get_order_total_quantity "$ORDER_ID")
FINAL_TOTAL=$(db_query "SELECT final_total FROM orders WHERE reference = '$REFERENCE'" | head -n 1 | tr -d '[:space:]')

# Stock should be reserved now
STOCK_AFTER_INIT=$(db_get_stock "$VALID_TIER_ID")

log_info "Reference:        $REFERENCE"
log_info "DB final_total:   $FINAL_TOTAL"
log_info "Expected tickets: $EXPECTED_TICKETS"
log_info "Stock after init: $BASELINE_STOCK → $STOCK_AFTER_INIT (reserved)"

assert_db_order_status "$REFERENCE" "pending" "Order must start as pending"
assert_equals "$STOCK_AFTER_INIT" "$(( BASELINE_STOCK - EXPECTED_TICKETS ))" \
    "Stock reserved at order creation (reserve-on-init)"

# ─── STEP 2: Build and Sign Webhook ───────────────────────────────────────────
log_info ""
log_info "Step 2: Building and signing Paystack webhook..."

# NOTE: "status" field — correct spelling, no double-s
PAYLOAD=$(printf '{"event":"charge.success","data":{"id":123456,"domain":"test","status":"success","reference":"%s","amount":%s,"paid_at":"%s","channel":"card","currency":"NGN","ip_address":"127.0.0.1","fees":1500,"customer":{"email":"webhook_integration@example.com"}}}' \
    "$REFERENCE" "$FINAL_TOTAL" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")")

PAYLOAD_FILE=$(mktemp)
printf '%s' "$PAYLOAD" > "$PAYLOAD_FILE"

PAYSTACK_KEY="${PAYSTACK_SECRET_KEY:-sk_test_88fabc001828fd93ff9c173bfef4e60a51df4cb4}"
SIGNATURE=$(openssl dgst -sha512 -hmac "$PAYSTACK_KEY" "$PAYLOAD_FILE" | awk '{print $2}')

log_info "Payload:   $PAYLOAD"
log_info "Signature: $SIGNATURE"

# ─── STEP 3: Send Webhook ─────────────────────────────────────────────────────
log_info ""
log_info "Step 3: Sending webhook to /api/webhooks/paystack..."
echo "------------------------------------"

WEBHOOK_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/webhooks/paystack" \
    -H "Content-Type: application/json" \
    -H "x-paystack-signature: $SIGNATURE" \
    --data-binary @"$PAYLOAD_FILE")

rm -f "$PAYLOAD_FILE"
log_info "Webhook response: $(echo "$WEBHOOK_RESPONSE" | jq -c '.' 2>/dev/null || echo "$WEBHOOK_RESPONSE")"
sleep 2

# ─── STEP 4: Verify DB State ──────────────────────────────────────────────────
log_info ""
log_info "Step 4: Verifying DB state..."
echo "------------------------------------"

assert_db_order_status "$REFERENCE" "success" "Order status must be success"

TICKET_COUNT=$(db_count_tickets "$ORDER_ID")
assert_equals "$TICKET_COUNT" "$EXPECTED_TICKETS" "Must have exactly $EXPECTED_TICKETS tickets"
log_success "✓ $TICKET_COUNT tickets generated"

assert_empty "$(db_check_duplicate_tickets "$ORDER_ID")" "Ticket codes must be unique"

# Stock check: with reserve-on-init, stock was already decremented at order creation.
# Webhook must NOT decrement it again. Final stock = baseline - expected.
FINAL_STOCK=$(db_get_stock "$VALID_TIER_ID")
EXPECTED_STOCK=$(( BASELINE_STOCK - EXPECTED_TICKETS ))
assert_equals "$FINAL_STOCK" "$EXPECTED_STOCK" \
    "Stock must be baseline ($BASELINE_STOCK) - $EXPECTED_TICKETS = $EXPECTED_STOCK"
log_info "Stock: $BASELINE_STOCK (baseline) → $STOCK_AFTER_INIT (after init) → $FINAL_STOCK (after webhook)"

# Sold must increase when payment completes
FINAL_SOLD=$(db_get_sold "$VALID_TIER_ID")
assert_equals "$FINAL_SOLD" "$(( BASELINE_SOLD + EXPECTED_TICKETS ))" \
    "Sold must increase by $EXPECTED_TICKETS after webhook"

PAID_AT=$(db_query "SELECT paid_at FROM orders WHERE reference = '$REFERENCE'" | head -n 1 | tr -d '[:space:]')
assert_not_empty "$PAID_AT" "paid_at must be set after webhook"

PROCESSED_BY=$(db_query "SELECT processed_by FROM orders WHERE reference = '$REFERENCE'" | head -n 1 | tr -d '[:space:]')
assert_not_empty "$PROCESSED_BY" "processed_by must be recorded"
log_info "processed_by: $PROCESSED_BY"

INACTIVE=$(db_query "SELECT COUNT(*) FROM tickets WHERE order_id = '$ORDER_ID' AND status != 'active'" | head -n 1 | tr -d '[:space:]')
assert_equals "$INACTIVE" "0" "All tickets must be active"

USED=$(db_query "SELECT COUNT(*) FROM tickets WHERE order_id = '$ORDER_ID' AND is_used = true" | head -n 1 | tr -d '[:space:]')
assert_equals "$USED" "0" "All new tickets must have is_used = false"

PAYMENT_COUNT=$(db_count_payments_for_order "$ORDER_ID")
[ "${PAYMENT_COUNT:-0}" -gt 0 ] \
    && log_success "✓ Payment record in payments table" \
    || log_warning "ℹ No payment record in payments table"

# Capacity invariant
CAPACITY=$(db_query "SELECT capacity FROM ticket_tiers WHERE id = '$VALID_TIER_ID'" | head -n 1 | tr -d '[:space:]')
assert_equals "$(( FINAL_STOCK + FINAL_SOLD ))" "$CAPACITY" "capacity = sold + available"

# ─── STEP 5: Integrity Check ──────────────────────────────────────────────────
log_info ""
log_info "Step 5: Full order integrity check..."
db_verify_order_integrity "$REFERENCE"

db_delete_order "$REFERENCE"

echo ""
print_test_summary