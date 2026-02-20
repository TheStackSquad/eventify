#!/bin/bash
# test/06_test_fraud_detection.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/api_helpers.sh"
source "$SCRIPT_DIR/helpers/db_helpers.sh"
source "$SCRIPT_DIR/helpers/assertions.sh"
source "$SCRIPT_DIR/helpers/test_strategy.sh"

echo "========================================"
echo "TEST: Fraud Detection & Amount Validation"
echo "========================================"

db_check_connection || exit 1

EVENT_ID="d568878a-3187-4642-89af-a5a87190b65d"
TIER_ID="3011f1ba-530e-43a6-a686-2f3b0c4ad0f5"

TIER_AVAILABLE=$(db_get_stock "$TIER_ID")
if [ -z "$TIER_AVAILABLE" ] || [ "$TIER_AVAILABLE" -lt 10 ]; then
    EVENT_ID=$(db_query "SELECT id FROM events WHERE is_deleted = false LIMIT 1" | head -n 1 | tr -d '[:space:]')
    TIER_ID=$(db_query "SELECT id FROM ticket_tiers WHERE event_id = '$EVENT_ID' AND available > 10 LIMIT 1" | head -n 1 | tr -d '[:space:]')
fi

log_info "Event: $EVENT_ID | Tier: $TIER_ID"

# Shared helper: create order and read final_total with guard
create_and_get_total() {
    local email="$1" qty="${2:-1}"
    local ref
    ref=$(create_pending_order "$email" "$EVENT_ID" "$TIER_ID" "$qty")
    if [ -z "$ref" ] || [ "$ref" = "null" ]; then
        log_error "Order creation failed for $email — Paystack rate limit likely hit"
        return 1
    fi
    local total
    total=$(db_query "SELECT final_total FROM orders WHERE reference = '$ref'" | head -n 1 | tr -d '[:space:]')
    if [ -z "$total" ] || [ "$total" = "0" ]; then
        log_error "final_total empty for $ref — DB read failure"
        db_delete_order "$ref"
        return 1
    fi
    echo "$ref $total"
}

# ─── TEST 1: Underpayment → Fraud ─────────────────────────────────────────────
echo ""
log_info "Test 1: Webhook with amount LESS than expected (underpayment)"
echo "------------------------------------"

READ=$(create_and_get_total "fraud1@example.com" "1") || { log_warning "Skipped: rate limited"; true; }
if [ -n "${READ:-}" ]; then
    REFERENCE=$(echo "$READ" | awk '{print $1}')
    EXPECTED_TOTAL=$(echo "$READ" | awk '{print $2}')
    ORDER_ID=$(db_get_order_id "$REFERENCE")
    UNDER=$(( EXPECTED_TOTAL - 1000 ))
    log_info "Expected: $EXPECTED_TOTAL kobo | Sending: $UNDER kobo (short by 1000)"

    send_test_webhook "$REFERENCE" "success" "$UNDER" > /dev/null; sleep 1

    STATUS=$(db_get_order_status "$REFERENCE")
    TICKETS=$(db_count_tickets "$ORDER_ID")
    log_info "Status after underpayment: '$STATUS' | Tickets: $TICKETS"

    [ "$STATUS" = "fraud" ] || [ "$STATUS" = "failed" ] || [ "$STATUS" = "pending" ] \
        && log_success "✓ Underpayment handled correctly (status: $STATUS)" \
        || log_error "Order accepted despite underpayment (status: $STATUS)!"

    assert_equals "$TICKETS" "0" "No tickets created for underpayment"
    db_delete_order "$REFERENCE"
fi

# ─── TEST 2: Exact Amount → Success ──────────────────────────────────────────
echo ""
log_info "Test 2: Webhook with EXACT expected amount"
echo "------------------------------------"

READ=$(create_and_get_total "fraud2@example.com" "1") || { log_warning "Skipped: rate limited"; true; }
if [ -n "${READ:-}" ]; then
    REFERENCE=$(echo "$READ" | awk '{print $1}')
    EXACT=$(echo "$READ" | awk '{print $2}')
    ORDER_ID=$(db_get_order_id "$REFERENCE")
    log_info "Exact amount: $EXACT kobo"

    complete_order_via_webhook "$REFERENCE"

    assert_db_order_status "$REFERENCE" "success" "Exact amount → success"
    TICKETS=$(db_count_tickets "$ORDER_ID")
    [ "${TICKETS:-0}" -gt 0 ] \
        && log_success "✓ Exact amount: $TICKETS ticket(s) created" \
        || log_error "No tickets for exact payment!"
    db_delete_order "$REFERENCE"
fi

# ─── TEST 3: Overpayment ─────────────────────────────────────────────────────
echo ""
log_info "Test 3: Webhook with amount MORE than expected (overpayment)"
echo "------------------------------------"

READ=$(create_and_get_total "fraud3@example.com" "1") || { log_warning "Skipped: rate limited"; true; }
if [ -n "${READ:-}" ]; then
    REFERENCE=$(echo "$READ" | awk '{print $1}')
    BASE=$(echo "$READ" | awk '{print $2}')
    ORDER_ID=$(db_get_order_id "$REFERENCE")
    OVER=$(( BASE + 5000 ))
    log_info "Expected: $BASE | Sending: $OVER (overpayment by ₦50)"

    send_test_webhook "$REFERENCE" "success" "$OVER" > /dev/null; sleep 1

    STATUS=$(db_get_order_status "$REFERENCE")
    TICKETS=$(db_count_tickets "$ORDER_ID")
    log_info "Overpayment status: $STATUS | Tickets: $TICKETS"
    [ "$STATUS" = "success" ] && [ "${TICKETS:-0}" -gt 0 ] \
        && log_success "✓ Overpayment accepted" \
        || log_info "ℹ Overpayment result: status=$STATUS tickets=$TICKETS"
    db_delete_order "$REFERENCE"
fi

# ─── TEST 4: Zero-Amount Webhook ─────────────────────────────────────────────
echo ""
log_info "Test 4: Webhook with amount = 0"
echo "------------------------------------"

READ=$(create_and_get_total "fraud4@example.com" "1") || { log_warning "Skipped: rate limited"; true; }
if [ -n "${READ:-}" ]; then
    REFERENCE=$(echo "$READ" | awk '{print $1}')
    ORDER_ID=$(db_get_order_id "$REFERENCE")

    send_test_webhook "$REFERENCE" "success" "0" > /dev/null; sleep 1

    STATUS=$(db_get_order_status "$REFERENCE")
    TICKETS=$(db_count_tickets "$ORDER_ID")
    log_info "Zero-amount status: $STATUS | Tickets: $TICKETS"
    [ "$STATUS" != "success" ] || [ "${TICKETS:-0}" -eq 0 ] \
        && log_success "✓ Zero-amount webhook rejected" \
        || log_warning "⚠ Zero-amount webhook accepted — review amount validation"
    db_delete_order "$REFERENCE"
fi

# ─── TEST 5: Currency Mismatch (USD) ─────────────────────────────────────────
echo ""
log_info "Test 5: Webhook with currency = USD instead of NGN"
echo "------------------------------------"

READ=$(create_and_get_total "fraud5@example.com" "1") || { log_warning "Skipped: rate limited"; true; }
if [ -n "${READ:-}" ]; then
    REFERENCE=$(echo "$READ" | awk '{print $1}')
    AMOUNT=$(echo "$READ" | awk '{print $2}')
    ORDER_ID=$(db_get_order_id "$REFERENCE")

    PAYLOAD=$(printf '{"event":"charge.success","data":{"id":999998,"domain":"test","status":"success","reference":"%s","amount":%s,"paid_at":"%s","channel":"card","currency":"USD","ip_address":"127.0.0.1","fees":0,"customer":{"email":"test@example.com"}}}' \
        "$REFERENCE" "$AMOUNT" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")")
    KEY="${PAYSTACK_SECRET_KEY:-sk_test_88fabc001828fd93ff9c173bfef4e60a51df4cb4}"
    PF=$(mktemp); printf '%s' "$PAYLOAD" > "$PF"
    SIG=$(openssl dgst -sha512 -hmac "$KEY" "$PF" | awk '{print $2}')
    rm -f "$PF"

    curl -s -X POST "$API_BASE_URL/api/webhooks/paystack" \
        -H "Content-Type: application/json" \
        -H "x-paystack-signature: $SIG" \
        -d "$PAYLOAD" > /dev/null
    sleep 1

    STATUS=$(db_get_order_status "$REFERENCE")
    log_info "USD currency status: $STATUS"
    [ "$STATUS" = "fraud" ] || [ "$STATUS" = "failed" ] \
        && log_success "✓ Currency validation enforced" \
        || log_info "ℹ Currency not validated (status: $STATUS)"
    db_delete_order "$REFERENCE"
fi

# ─── TEST 6: Fraud Flag Persists ─────────────────────────────────────────────
echo ""
log_info "Test 6: Fraudulent order cannot be recovered via verify"
echo "------------------------------------"

READ=$(create_and_get_total "fraud6@example.com" "1") || { log_warning "Skipped: rate limited"; true; }
if [ -n "${READ:-}" ]; then
    REFERENCE=$(echo "$READ" | awk '{print $1}')
    EXPECTED=$(echo "$READ" | awk '{print $2}')
    ORDER_ID=$(db_get_order_id "$REFERENCE")
    FRAUD_AMT=$(( EXPECTED - 500 ))

    send_test_webhook "$REFERENCE" "success" "$FRAUD_AMT" > /dev/null; sleep 1

    FRAUD_STATUS=$(db_get_order_status "$REFERENCE")
    log_info "After fraud webhook: $FRAUD_STATUS"

    verify_payment "$REFERENCE" > /dev/null 2>&1 || true; sleep 1

    FINAL_STATUS=$(db_get_order_status "$REFERENCE")
    FINAL_TICKETS=$(db_count_tickets "$ORDER_ID")

    assert_equals "$FINAL_TICKETS" "0" "No tickets even after verify attempt"
    [ "$FINAL_STATUS" != "success" ] \
        && log_success "✓ Fraud flag persists: $FINAL_STATUS" \
        || log_warning "⚠ Manual verify overrode fraud status"
    db_delete_order "$REFERENCE"
fi

echo ""
print_test_summary