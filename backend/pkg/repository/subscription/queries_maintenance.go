//backend/pkg/repository/subscription/queries_maintenance.go

package subscription

import (
    "context"
    "github.com/eventify/backend/pkg/models"
)

func (r *subscriptionRepository) GetExpired(ctx context.Context) ([]models.Subscription, error) {
    query := `
        SELECT * FROM subscriptions 
        WHERE status = $1 
          AND expires_at IS NOT NULL 
          AND expires_at < NOW()`
    
    var expired []models.Subscription
    err := r.db.SelectContext(ctx, &expired, query, models.SubStatusActive)
    return expired, err
}