#!/bin/bash
# helpers/db_helpers.sh
# Database helper functions for Eventify test suite

export PSQL_BIN="/c/Program Files/PostgreSQL/18/bin/psql.exe"
export DB_URI="postgres://astronautdesh:astronautdesh@localhost:5432/Eventify?sslmode=disable"

unset VSCODE_GIT_ASKPASS_MAIN VSCODE_GIT_ASKPASS_NODE VSCODE_GIT_IPC_HANDLE VSCODE_GIT_ASKPASS_EXTRA_ARGS

# ─── CORE ─────────────────────────────────────────────────────────────────────

db_query() {
    local query="$1"
    MSYS_NO_PATHCONV=1 "$PSQL_BIN" "$DB_URI" -t -A -c "$query" 2>/dev/null
}

db_check_connection() {
    db_query "SELECT 1" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        log_error "Database connection failed. Check DB_URI and PostgreSQL."
        return 1
    fi
    log_info "Database connection OK"
}

db_extract() {
    echo "$1" | grep -vE '^\s*$|^\(|^-' | head -n 1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# ─── ORDER QUERIES ─────────────────────────────────────────────────────────────

db_get_order_status() {
    local reference="$1"
    db_query "SELECT status FROM orders WHERE reference = '$reference'" | head -n 1 | tr -d '[:space:]'
}

db_get_order_id() {
    local reference="$1"
    db_query "SELECT id FROM orders WHERE reference = '$reference'" | head -n 1 | tr -d '[:space:]'
}

db_order_exists() {
    local reference="$1"
    local count
    count=$(db_query "SELECT COUNT(*) FROM orders WHERE reference = '$reference'" | head -n 1 | tr -d '[:space:]')
    [ "${count:-0}" -gt 0 ]
}

db_get_order_financials() {
    local reference="$1"
    db_query "SELECT subtotal, service_fee, vat_amount, final_total, amount_paid FROM orders WHERE reference = '$reference'"
}

db_get_order_processing_info() {
    local reference="$1"
    db_query "SELECT processed_by, webhook_attempts, paid_at, created_at, updated_at FROM orders WHERE reference = '$reference'"
}

db_get_pending_orders() {
    db_query "SELECT reference, customer_email, final_total, created_at FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10"
}

db_get_orders_by_status() {
    local status="$1"
    db_query "SELECT reference, customer_email, status, final_total, created_at FROM orders WHERE status = '$status' ORDER BY created_at DESC LIMIT 10"
}

# ─── TICKET QUERIES ────────────────────────────────────────────────────────────

db_count_tickets() {
    local order_id="$1"
    db_query "SELECT COUNT(*) FROM tickets WHERE order_id = '$order_id'" | head -n 1 | tr -d '[:space:]'
}

db_get_tickets() {
    local order_id="$1"
    db_query "SELECT t.code, t.status, t.is_used, tt.name as tier_name FROM tickets t JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id WHERE t.order_id = '$order_id'"
}

db_count_tickets_by_status() {
    local order_id="$1" status="$2"
    db_query "SELECT COUNT(*) FROM tickets WHERE order_id = '$order_id' AND status = '$status'" | head -n 1 | tr -d '[:space:]'
}

db_get_unused_tickets_count() {
    local order_id="$1"
    db_query "SELECT COUNT(*) FROM tickets WHERE order_id = '$order_id' AND is_used = false" | head -n 1 | tr -d '[:space:]'
}

db_check_duplicate_tickets() {
    local order_id="$1"
    db_query "SELECT code, COUNT(*) as cnt FROM tickets WHERE order_id = '$order_id' GROUP BY code HAVING COUNT(*) > 1"
}

# ─── TIER / STOCK QUERIES ──────────────────────────────────────────────────────

db_get_stock() {
    local tier_id="$1"
    db_query "SELECT available FROM ticket_tiers WHERE id = '$tier_id'" | head -n 1 | tr -d '[:space:]'
}

db_get_sold() {
    local tier_id="$1"
    db_query "SELECT sold FROM ticket_tiers WHERE id = '$tier_id'" | head -n 1 | tr -d '[:space:]'
}

db_get_tier_info() {
    local tier_id="$1"
    db_query "SELECT name, capacity, sold, available, price_kobo FROM ticket_tiers WHERE id = '$tier_id'"
}

db_verify_stock_consistency() {
    local tier_id="$1"
    db_query "SELECT capacity, sold, available, (capacity - sold) AS calculated_available, CASE WHEN available = (capacity - sold) THEN 'CONSISTENT' ELSE 'INCONSISTENT' END AS integrity FROM ticket_tiers WHERE id = '$tier_id'"
}

# ─── ORDER ITEMS ───────────────────────────────────────────────────────────────

db_get_order_items_count() {
    local order_id="$1"
    db_query "SELECT COUNT(*) FROM order_items WHERE order_id = '$order_id'" | head -n 1 | tr -d '[:space:]'
}

db_get_order_total_quantity() {
    local order_id="$1"
    db_query "SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id = '$order_id'" | head -n 1 | tr -d '[:space:]'
}

# ─── PAYMENTS TABLE ────────────────────────────────────────────────────────────

db_get_payment_for_order() {
    local order_id="$1"
    db_query "SELECT gateway_reference, amount_paid, currency, status, channel, paid_at FROM payments WHERE order_id = '$order_id'"
}

db_count_payments_for_order() {
    local order_id="$1"
    db_query "SELECT COUNT(*) FROM payments WHERE order_id = '$order_id'" | head -n 1 | tr -d '[:space:]'
}

# ─── INTEGRITY / ASSERTIONS ────────────────────────────────────────────────────

assert_db_order_status() {
    local reference="$1" expected_status="$2" message="${3:-Order status check}"
    local actual_status
    actual_status=$(db_get_order_status "$reference")
    assert_equals "$actual_status" "$expected_status" "$message"
}

db_verify_order_integrity() {
    local reference="$1"
    log_info "Verifying order integrity: $reference"
    local order_id
    order_id=$(db_get_order_id "$reference")
    if [ -z "$order_id" ]; then log_error "Order not found: $reference"; return 1; fi

    local items_count
    items_count=$(db_get_order_items_count "$order_id")
    [ "$items_count" -eq 0 ] && { log_error "No order items found"; return 1; }
    log_info "✓ Order items: $items_count"

    local order_status
    order_status=$(db_get_order_status "$reference")
    if [ "$order_status" = "success" ]; then
        local expected_tickets actual_tickets
        expected_tickets=$(db_get_order_total_quantity "$order_id")
        actual_tickets=$(db_count_tickets "$order_id")
        [ "$expected_tickets" != "$actual_tickets" ] && {
            log_error "Ticket mismatch: expected $expected_tickets got $actual_tickets"; return 1
        }
        log_info "✓ Tickets: $actual_tickets"
        local duplicates
        duplicates=$(db_check_duplicate_tickets "$order_id")
        [ -n "$duplicates" ] && { log_error "Duplicate codes: $duplicates"; return 1; }
        log_info "✓ No duplicate ticket codes"
    fi

    log_success "Order integrity verified ✓"
    return 0
}

# ─── CLEANUP ───────────────────────────────────────────────────────────────────

# db_delete_order <reference>
# Deletes order and ALL associated records.
# CRITICALLY: Also restores ticket_tiers.sold and ticket_tiers.available
# for any tickets that were issued — so stock baselines stay correct
# across test runs. Without this, every successful order permanently
# corrupts stock numbers for subsequent tests.
db_delete_order() {
    local reference="$1"
    local order_id
    order_id=$(db_get_order_id "$reference")
    [ -z "$order_id" ] && return 0

    # Restore stock for each tier that had tickets issued under this order
    # Only restore if order was 'success' (tickets were actually deducted)
    local order_status
    order_status=$(db_get_order_status "$reference")

    if [ "$order_status" = "success" ]; then
        # Get per-tier ticket counts and restore them
        db_query "
            UPDATE ticket_tiers tt
            SET
                sold      = sold      - t.ticket_count,
                available = available + t.ticket_count
            FROM (
                SELECT ticket_tier_id, COUNT(*) AS ticket_count
                FROM tickets
                WHERE order_id = '$order_id'
                GROUP BY ticket_tier_id
            ) t
            WHERE tt.id = t.ticket_tier_id
        " > /dev/null
    fi

    # Also restore stock reserved by order_items for pending/failed orders
    # (covers reserve-on-init design where available was decremented at init)
    if [ "$order_status" = "pending" ] || [ "$order_status" = "failed" ]; then
    db_query "
        UPDATE ticket_tiers tt
        SET available = available + oi.quantity,
            sold      = sold      - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = '$order_id'
          AND tt.id = oi.ticket_tier_id
          AND tt.available < tt.capacity
    " > /dev/null 2>/dev/null || true
fi

    # Delete records in dependency order
    db_query "DELETE FROM tickets     WHERE order_id = '$order_id'" > /dev/null
    db_query "DELETE FROM order_items WHERE order_id = '$order_id'" > /dev/null
    db_query "DELETE FROM payments    WHERE order_id = '$order_id'" > /dev/null
    db_query "DELETE FROM orders      WHERE id       = '$order_id'" > /dev/null

    log_info "Cleaned up order: $reference"
}

# db_cleanup_test_orders
# Bulk cleanup of all @example.com orders with stock restoration.
db_cleanup_test_orders() {
    log_info "Cleaning up all example.com test orders..."

    # Restore stock for successful example.com orders
    db_query "
        UPDATE ticket_tiers tt
        SET
            sold      = sold      - t.ticket_count,
            available = available + t.ticket_count
        FROM (
            SELECT tk.ticket_tier_id, COUNT(*) AS ticket_count
            FROM tickets tk
            JOIN orders o ON tk.order_id = o.id
            WHERE o.customer_email LIKE '%@example.com'
              AND o.status = 'success'
            GROUP BY tk.ticket_tier_id
        ) t
        WHERE tt.id = t.ticket_tier_id
    " > /dev/null 2>/dev/null || true

    db_query "DELETE FROM tickets     WHERE order_id IN (SELECT id FROM orders WHERE customer_email LIKE '%@example.com');" > /dev/null
    db_query "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_email LIKE '%@example.com');" > /dev/null
    db_query "DELETE FROM payments    WHERE order_id IN (SELECT id FROM orders WHERE customer_email LIKE '%@example.com');" > /dev/null
    db_query "DELETE FROM orders      WHERE customer_email LIKE '%@example.com';" > /dev/null

    log_success "Cleanup complete"
}

# ─── EXPORTS ───────────────────────────────────────────────────────────────────

export -f db_query db_check_connection db_extract
export -f db_get_order_status db_get_order_id db_order_exists
export -f db_get_order_financials db_get_order_processing_info
export -f db_get_pending_orders db_get_orders_by_status
export -f db_count_tickets db_get_tickets db_count_tickets_by_status
export -f db_get_unused_tickets_count db_check_duplicate_tickets
export -f db_get_stock db_get_sold db_get_tier_info db_verify_stock_consistency
export -f db_get_order_items_count db_get_order_total_quantity
export -f db_get_payment_for_order db_count_payments_for_order
export -f assert_db_order_status db_verify_order_integrity
export -f db_delete_order db_cleanup_test_orders