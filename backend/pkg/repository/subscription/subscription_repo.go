// backend/pkg/repository/subscription/subscription_repo.go
package subscription

import (
	"context"
	"time"

	"github.com/eventify/backend/pkg/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// SubscriptionRepository defines subscription data access
type SubscriptionRepository interface {
    Create(ctx context.Context, sub *models.Subscription) (uuid.UUID, error)
    UpdateStatus(ctx context.Context, id uuid.UUID, status models.SubscriptionStatus) error
    UpdateAfterPayment(ctx context.Context, id uuid.UUID, params PaymentUpdateParams) error
    GetByID(ctx context.Context, id uuid.UUID) (*models.Subscription, error)
    GetByReference(ctx context.Context, reference string) (*models.Subscription, error)
    IncrementWebhookAttempts(ctx context.Context, reference string) error
    
    // Add these two:
    GetExpired(ctx context.Context) ([]models.Subscription, error)
    RunInTransaction(ctx context.Context, fn func(tx *sqlx.Tx) error) error
}

// PaymentUpdateParams groups payment update fields
type PaymentUpdateParams struct {
	Status           models.SubscriptionStatus
	PaymentReference string
	PaymentMethod    string
	LastPaymentDate  time.Time
	NextPaymentDate  time.Time
	ExpiresAt        time.Time
}

type subscriptionRepository struct {
	db *sqlx.DB
}

// NewSubscriptionRepository creates a subscription repository
func NewSubscriptionRepository(db *sqlx.DB) SubscriptionRepository {
	return &subscriptionRepository{db: db}
}

