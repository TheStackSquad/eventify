// backend/pkg/repository/subscription/subscription_repo.go
package subscription

import (
	"context"
	"fmt"
	"time"

	"github.com/eventify/backend/pkg/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

// SubscriptionRepository defines the data-access contract for subscriptions.
// This is a write-only repo. Reads are handled via the joined query in
// VendorRepository.GetVendorWithSubscription so that vendor + subscription
// data is fetched in a single pool hit.
type SubscriptionRepository interface {
	// Create inserts a new subscription row and returns the generated ID.
	Create(ctx context.Context, sub *models.Subscription) (uuid.UUID, error)

	// UpdateStatus sets the status (and UpdatedAt) on a subscription.
	UpdateStatus(ctx context.Context, id uuid.UUID, status models.SubscriptionStatus) error

	// UpdateAfterPayment persists all fields that change once a payment is confirmed:
	// status, payment_reference, payment_method, last_payment_date, next_payment_date, expires_at.
	UpdateAfterPayment(ctx context.Context, id uuid.UUID, params PaymentUpdateParams) error
}

// PaymentUpdateParams groups every field that flips on successful payment,
// so we update them atomically in one query.
type PaymentUpdateParams struct {
	Status          models.SubscriptionStatus
	PaymentReference string
	PaymentMethod    string
	LastPaymentDate  time.Time
	NextPaymentDate  time.Time
	ExpiresAt        time.Time
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

type subscriptionRepository struct {
	db *sqlx.DB
}

// NewSubscriptionRepository constructs a concrete SubscriptionRepository.
func NewSubscriptionRepository(db *sqlx.DB) SubscriptionRepository {
	return &subscriptionRepository{db: db}
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const createSubscriptionQuery = `
	INSERT INTO subscriptions (
		id, vendor_id, tier, status, starts_at, expires_at,
		auto_renew, price, currency,
		payment_reference, payment_method,
		last_payment_date, next_payment_date,
		created_at, updated_at
	) VALUES (
		$1, $2, $3, $4, $5, $6,
		$7, $8, $9,
		$10, $11,
		$12, $13,
		$14, $15
	)
`

func (r *subscriptionRepository) Create(ctx context.Context, sub *models.Subscription) (uuid.UUID, error) {
	if sub.ID == uuid.Nil {
		sub.ID = uuid.New()
	}

	now := time.Now().UTC()
	if sub.CreatedAt.IsZero() {
		sub.CreatedAt = now
	}
	if sub.UpdatedAt.IsZero() {
		sub.UpdatedAt = now
	}

	_, err := r.db.ExecContext(ctx, createSubscriptionQuery,
		sub.ID,
		sub.VendorID,
		sub.Tier,
		sub.Status,
		sub.StartsAt,
		sub.ExpiresAt,
		sub.AutoRenew,
		sub.Price,
		sub.Currency,
		sub.PaymentReference,
		sub.PaymentMethod,
		sub.LastPaymentDate,
		sub.NextPaymentDate,
		sub.CreatedAt,
		sub.UpdatedAt,
	)
	if err != nil {
		return uuid.Nil, fmt.Errorf("subscription repo create: %w", err)
	}

	return sub.ID, nil
}

// ---------------------------------------------------------------------------
// UpdateStatus
// ---------------------------------------------------------------------------

const updateStatusQuery = `
	UPDATE subscriptions
	SET status = $1, updated_at = $2
	WHERE id = $3
`

func (r *subscriptionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.SubscriptionStatus) error {
	result, err := r.db.ExecContext(ctx, updateStatusQuery, status, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("subscription repo update status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("subscription repo update status rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("subscription repo update status: no subscription found with id %s", id)
	}

	return nil
}

// ---------------------------------------------------------------------------
// UpdateAfterPayment — single atomic update for everything that changes
// on a confirmed payment.
// ---------------------------------------------------------------------------

const updateAfterPaymentQuery = `
	UPDATE subscriptions
	SET
		status             = $1,
		payment_reference  = $2,
		payment_method     = $3,
		last_payment_date  = $4,
		next_payment_date  = $5,
		expires_at         = $6,
		updated_at         = $7
	WHERE id = $8
`

func (r *subscriptionRepository) UpdateAfterPayment(ctx context.Context, id uuid.UUID, params PaymentUpdateParams) error {
	result, err := r.db.ExecContext(ctx, updateAfterPaymentQuery,
		params.Status,
		params.PaymentReference,
		params.PaymentMethod,
		params.LastPaymentDate,
		params.NextPaymentDate,
		params.ExpiresAt,
		time.Now().UTC(),
		id,
	)
	if err != nil {
		return fmt.Errorf("subscription repo update after payment: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("subscription repo update after payment rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("subscription repo update after payment: no subscription found with id %s", id)
	}

	return nil
}