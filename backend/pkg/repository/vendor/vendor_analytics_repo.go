// backend/pkg/repository/vendor/vendor_analytics_repo.go

package vendor

import (
	"context"

	"github.com/eventify/backend/pkg/models"
	"github.com/google/uuid"
)

// VendorCoreMetricsRepository handles fetching pre-calculated metrics.
type VendorCoreMetricsRepository interface {
	GetVendorTrustScore(ctx context.Context, vendorID uuid.UUID) (*models.VendorTrustScore, error)
	GetVendorBasicInfo(ctx context.Context, vendorID uuid.UUID) (*models.VendorBasicInfo, error)
}

// VendorMetricsRepository handles aggregated analytics.
type VendorMetricsRepository interface {
	GetInquiryCountByPeriod(ctx context.Context, vendorID uuid.UUID, days int) (int, error)
	GetReviewMetrics(ctx context.Context, vendorID uuid.UUID) (*models.ReviewMetricsRaw, error)
	GetReviewCountByPeriod(ctx context.Context, vendorID uuid.UUID, days int) (int, error)
	GetAverageRatingByPeriod(ctx context.Context, vendorID uuid.UUID, days int) (float64, error)
}

// VendorDataRepository handles detailed lists.
type VendorDataRepository interface {
	GetRecentInquiries(ctx context.Context, vendorID uuid.UUID, limit int) ([]models.RecentInquiry, error)
	GetRecentReviews(ctx context.Context, vendorID uuid.UUID, limit int) ([]models.RecentReview, error)
}

// VendorPublicStatsRepository handles tracking and subscription details.
type VendorPublicStatsRepository interface {
	RecordProfileView(ctx context.Context, vendorID uuid.UUID, viewerID *uuid.UUID, viewerIP string, sessionID string, userAgent string) (bool, error)
	GetProfileViewCount30d(ctx context.Context, vendorID uuid.UUID) (int, error)
	GetCategoryRank(ctx context.Context, vendorID uuid.UUID) (rank int, total int, category string, err error)
	GetLocationRank(ctx context.Context, vendorID uuid.UUID) (rank int, total int, location string, err error)
	GetVendorTier(ctx context.Context, vendorID uuid.UUID) (models.SubscriptionTier, error)
	// Updated to match your implementation type
	GetVendorSubscription(ctx context.Context, vendorID uuid.UUID) (*models.VendorWithSubscription, error)
}