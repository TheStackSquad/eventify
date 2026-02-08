//backend/pkg/services/subscription/subscription_expiry.go
package subscription

import (
	"context"
	"time"

	"github.com/eventify/backend/pkg/models"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

func (s *subscriptionServiceImpl) StartExpiryWorker(ctx context.Context, checkInterval time.Duration) {
	ticker := time.NewTicker(checkInterval)
	defer ticker.Stop()

	log.Info().Dur("interval", checkInterval).Msg("Starting subscription expiry worker")

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.expireOldSubscriptions(ctx); err != nil {
				log.Error().Err(err).Msg("Expiry worker failed")
			}
		}
	}
}

func (s *subscriptionServiceImpl) expireOldSubscriptions(ctx context.Context) error {
	// Call the interface method - logic is now encapsulated in the repo
	expired, err := s.subscriptionRepo.GetExpired(ctx)
	if err != nil {
		return err
	}

	if len(expired) == 0 {
		return nil
	}

	for _, sub := range expired {
		// Use sub.ID.String() since GetExpired returns []models.Subscription
		if err := s.processExpiredSubscription(ctx, sub.ID.String(), sub.VendorID.String()); err != nil {
			log.Error().Err(err).Str("subID", sub.ID.String()).Msg("Failed to expire")
			continue
		}
	}
	return nil
}

func (s *subscriptionServiceImpl) processExpiredSubscription(ctx context.Context, subID, vendorID string) error {
	// Use the interface's Transaction helper
	return s.subscriptionRepo.RunInTransaction(ctx, func(tx *sqlx.Tx) error {
		_, err := tx.ExecContext(ctx,
			`UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2`,
			models.SubStatusExpired, subID,
		)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx,
			`UPDATE vendors SET subscription_tier = $1, updated_at = NOW() WHERE id = $2`,
			models.TierFree, vendorID,
		)
		return err
	})
}