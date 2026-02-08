// backend/pkg/repository/ vendor/vendor_metrics_repo.go

package vendor

import (
	"context"
	"fmt"
	"time"

	"github.com/eventify/backend/pkg/models"
	"github.com/google/uuid"
	 "database/sql"
	"github.com/jmoiron/sqlx"
)

type PostgresVendorMetricsRepository struct {
	DB *sqlx.DB
}

type PostgresVendorCoreMetricsRepository struct {
	DB *sqlx.DB
}

func NewVendorCoreMetricsRepository(db *sqlx.DB) VendorCoreMetricsRepository {
	return &PostgresVendorCoreMetricsRepository{DB: db}
}

func NewVendorMetricsRepository(db *sqlx.DB) VendorMetricsRepository {
	return &PostgresVendorMetricsRepository{DB: db}
}

func NewVendorDataRepository(db *sqlx.DB) VendorDataRepository {
	return &PostgresVendorDataRepository{db: db}
}

func (r *PostgresVendorCoreMetricsRepository) GetVendorTrustScore(ctx context.Context, vendorID uuid.UUID) (*models.VendorTrustScore, error) {
	query := `
		SELECT 
			pvs_score as total_trust_weight,
			review_count
		FROM vendors 
		WHERE id = $1`

	var score models.VendorTrustScore
	err := r.DB.GetContext(ctx, &score, query, vendorID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch vendor trust score: %w", err)
	}
	return &score, nil
}

func (r *PostgresVendorCoreMetricsRepository) GetVendorBasicInfo(ctx context.Context, vendorID uuid.UUID) (*models.VendorBasicInfo, error) {
	// The Enriched Query: Joins vendors, subscriptions (active only), and stats
	query := `
		SELECT 
			v.id, v.name, v.category, v.pvs_score, v.review_count, 
			v.is_identity_verified, v.cac_number, v.is_business_verified,
			v.profile_completion, v.inquiry_count, v.responded_count, 
			v.created_at, v.updated_at,
			COALESCE(s.tier, 'free') as tier,
			COALESCE(s.status, 'inactive') as subscription_status,
			COALESCE(st.views_total, 0) as views_total,
			COALESCE(st.views_30d, 0) as views_30d
		FROM vendors v
		LEFT JOIN subscriptions s ON v.id = s.vendor_id 
			AND s.status = 'active' 
			AND (s.expires_at IS NULL OR s.expires_at > NOW())
		LEFT JOIN vendor_stats st ON v.id = st.vendor_id
		WHERE v.id = $1
		LIMIT 1`

	var info models.VendorBasicInfo
	err := r.DB.GetContext(ctx, &info, query, vendorID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch enriched vendor basic info: %w", err)
	}

	return &info, nil
}

// Add after GetVendorBasicInfo implementation (around line 50-60)

func (r *PostgresVendorCoreMetricsRepository) GetVendorTier(ctx context.Context, vendorID uuid.UUID) (models.SubscriptionTier, error) {
	query := `
		SELECT tier 
		FROM subscriptions
		WHERE vendor_id = $1
		  AND status = 'active'
		  AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY starts_at DESC
		LIMIT 1
	`

	var tier string
	err := r.DB.QueryRowContext(ctx, query, vendorID).Scan(&tier)

	if err == sql.ErrNoRows {
		return models.TierFree, nil
	}
	if err != nil {
		return models.TierFree, fmt.Errorf("failed to get vendor tier: %w", err)
	}

	return models.SubscriptionTier(tier), nil
}

func (r *PostgresVendorMetricsRepository) GetInquiryCountByPeriod(ctx context.Context, vendorID uuid.UUID, days int) (int, error) {
	startDate := time.Now().AddDate(0, 0, -days)
	query := `SELECT COUNT(*) FROM inquiries WHERE vendor_id = $1 AND created_at >= $2`
	
	var count int
	err := r.DB.GetContext(ctx, &count, query, vendorID, startDate)
	if err != nil {
		return 0, fmt.Errorf("failed to count inquiries by period: %w", err)
	}
	
	return count, nil
}

func (r *PostgresVendorMetricsRepository) GetReviewMetrics(ctx context.Context, vendorID uuid.UUID) (*models.ReviewMetricsRaw, error) {
	query := `
		SELECT 
			COUNT(*) as total_reviews,
			COALESCE(AVG(rating), 0) as avg_rating,
			SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star,
			SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
			SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
			SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
			SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star
		FROM reviews 
		WHERE vendor_id = $1
	`
	
	var metrics struct {
		TotalReviews int     `db:"total_reviews"`
		AvgRating    float64 `db:"avg_rating"`
		OneStar      int     `db:"one_star"`
		TwoStar      int     `db:"two_star"`
		ThreeStar    int     `db:"three_star"`
		FourStar     int     `db:"four_star"`
		FiveStar     int     `db:"five_star"`
	}
	
	err := r.DB.GetContext(ctx, &metrics, query, vendorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get review metrics: %w", err)
	}

	ratingCounts := make(map[int]int)
	ratingCounts[1] = metrics.OneStar
	ratingCounts[2] = metrics.TwoStar
	ratingCounts[3] = metrics.ThreeStar
	ratingCounts[4] = metrics.FourStar
	ratingCounts[5] = metrics.FiveStar

	return &models.ReviewMetricsRaw{
		TotalReviews:  metrics.TotalReviews,
		AverageRating: metrics.AvgRating,
		RatingCounts:  ratingCounts,
	}, nil
}

func (r *PostgresVendorMetricsRepository) GetReviewCountByPeriod(ctx context.Context, vendorID uuid.UUID, days int) (int, error) {
	startDate := time.Now().AddDate(0, 0, -days)
	query := `SELECT COUNT(*) FROM reviews WHERE vendor_id = $1 AND created_at >= $2`
	
	var count int
	err := r.DB.GetContext(ctx, &count, query, vendorID, startDate)
	if err != nil {
		return 0, fmt.Errorf("failed to count reviews by period: %w", err)
	}
	
	return count, nil
}

func (r *PostgresVendorMetricsRepository) GetAverageRatingByPeriod(ctx context.Context, vendorID uuid.UUID, days int) (float64, error) {
	startDate := time.Now().AddDate(0, 0, -days)
	query := `SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE vendor_id = $1 AND created_at >= $2`
	
	var avgRating float64
	err := r.DB.GetContext(ctx, &avgRating, query, vendorID, startDate)
	if err != nil {
		return 0.0, fmt.Errorf("failed to calculate average rating by period: %w", err)
	}

	return avgRating, nil
}


func (r *PostgresVendorMetricsRepository) GetVendorTier(ctx context.Context, vendorID uuid.UUID) (models.SubscriptionTier, error) {
    query := `SELECT subscription_tier FROM vendors WHERE id = $1`
    
    var tier string
    err := r.DB.QueryRowContext(ctx, query, vendorID).Scan(&tier)

    if err == sql.ErrNoRows {
        return models.TierFree, nil
    }

    if err != nil {
        return models.TierFree, fmt.Errorf("failed to get vendor tier: %w", err)
    }

    return models.SubscriptionTier(tier), nil
}



