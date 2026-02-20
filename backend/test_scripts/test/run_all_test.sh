#!/bin/bash
# test/run_all_tests.sh
# Master runner — executes all suites sequentially with cooldown between them

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/api_helpers.sh"
source "$SCRIPT_DIR/helpers/db_helpers.sh"
source "$SCRIPT_DIR/helpers/assertions.sh"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================"
echo "EVENTIFY TEST SUITE — FULL RUN"
echo "Started: $(date)"
echo "========================================"
echo ""

# ─── Pre-flight ───────────────────────────────────────────────────────────────
log_info "Pre-flight: Checking connectivity..."

if ! db_check_connection; then
    log_error "Database not reachable. Aborting."
    exit 1
fi

if ! curl -s "$API_BASE_URL/health" | grep -q "ok"; then
    log_error "API not responding at $API_BASE_URL"
    exit 1
fi

log_success "✓ API and DB are up"

# ─── Suite registry ───────────────────────────────────────────────────────────
# Format: "script.sh:Label:cooldown_seconds_after"
# Cooldown lets Paystack test-mode rate limits recover between suites.
TESTS=(
    "01_test_order_init_enhanced.sh:Order Initialization:10"
    "02_test_payment_verify_enhanced.sh:Payment Verification:10"
    "03_test_idempotency.sh:Idempotency & Race Conditions:10"
    "04_test_concurrent.sh:Concurrent Verification:10"
    "04_test_webhook_scenarios.sh:Webhook Scenarios:5"
    "05_test_stock_consistency.sh:Stock Consistency:10"
    "06_test_fraud_detection.sh:Fraud Detection:5"
    "07_test_webhook.sh:Webhook Integration:0"
)

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
FAILED_SUITES=()

# ─── Run suites ───────────────────────────────────────────────────────────────
for TEST_ENTRY in "${TESTS[@]}"; do
    SCRIPT="${TEST_ENTRY%%:*}"
    REST="${TEST_ENTRY#*:}"
    LABEL="${REST%%:*}"
    COOLDOWN="${REST##*:}"
    SUITE_LOG="$LOG_DIR/${SCRIPT%.sh}_$TIMESTAMP.log"
    FULL_PATH="$SCRIPT_DIR/$SCRIPT"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "SUITE: $LABEL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ ! -f "$FULL_PATH" ]; then
        log_warning "Skipped (not found): $SCRIPT"
        SKIP_COUNT=$(( SKIP_COUNT + 1 ))
        continue
    fi

    if bash "$FULL_PATH" 2>&1 | tee "$SUITE_LOG"; then
        log_success "SUITE PASSED: $LABEL"
        PASS_COUNT=$(( PASS_COUNT + 1 ))
    else
        log_error "SUITE FAILED: $LABEL → $SUITE_LOG"
        FAIL_COUNT=$(( FAIL_COUNT + 1 ))
        FAILED_SUITES+=("$LABEL")
    fi

    # Clean up any leaked test orders
    db_cleanup_test_orders 2>/dev/null || true

    # Rate-limit cooldown between suites
    if [ "${COOLDOWN:-0}" -gt 0 ]; then
        log_info "Cooldown: ${COOLDOWN}s (Paystack rate limit recovery)..."
        sleep "$COOLDOWN"
    fi
done

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo "FINAL RESULTS"
echo "========================================"
echo "Passed:  $PASS_COUNT"
echo "Failed:  $FAIL_COUNT"
echo "Skipped: $SKIP_COUNT"
echo "Finished: $(date)"
echo ""

if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
    echo "Failed suites:"
    for S in "${FAILED_SUITES[@]}"; do echo "  ✗ $S"; done
    echo ""
    exit 1
fi

echo "All suites passed ✓"
exit 0