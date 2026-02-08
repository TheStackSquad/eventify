// backend/pkg/services/vendor/analytics_service.go

package vendor

import (
	"context"
	"fmt"
	"sync"

	"github.com/eventify/backend/pkg/models"
	repovendor "github.com/eventify/backend/pkg/repository/vendor"
	"github.com/google/uuid"
)

type VendorAnalyticsService interface {
	GetVendorAnalytics(ctx context.Context, vendorID uuid.UUID) (*models.VendorAnalyticsResponse, error)
}

type vendorAnalyticsServiceImpl struct {
	coreRepo    repovendor.VendorCoreMetricsRepository
	metricsRepo repovendor.VendorMetricsRepository
	dataRepo    repovendor.VendorDataRepository
}

func NewVendorAnalyticsService(
	cr repovendor.VendorCoreMetricsRepository,
	mr repovendor.VendorMetricsRepository,
	dr repovendor.VendorDataRepository,
) VendorAnalyticsService {
	return &vendorAnalyticsServiceImpl{
		coreRepo:    cr,
		metricsRepo: mr,
		dataRepo:    dr,
	}
}

func (s *vendorAnalyticsServiceImpl) GetVendorAnalytics(ctx context.Context, vendorID uuid.UUID) (*models.VendorAnalyticsResponse, error) {
	// PHASE 1: Synchronous Core Data
	// Basic Info is required for all subsequent calculations
	vendorInfo, err := s.coreRepo.GetVendorBasicInfo(ctx, vendorID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve vendor profile: %w", err)
	}

	trustScore, err := s.coreRepo.GetVendorTrustScore(ctx, vendorID)
	if err != nil {
		trustScore = &models.VendorTrustScore{TotalTrustWeight: 0}
	}

	// PHASE 2: Concurrent Data Acquisition
	var (
		wg              sync.WaitGroup
		reviewMetrics   *models.ReviewMetricsRaw
		recentReviews   []models.RecentReview
		recentInquiries []models.RecentInquiry
		
		// Metric Windows
		in7, rev7, in30, rev30 int
		avg7, avg30            float64
	)

	errCh := make(chan error, 10) // Increased buffer for 5 concurrent tasks

	// Task 1: Comprehensive Review Stats
	wg.Add(1)
	go func() {
		defer wg.Done()
		var e error
		reviewMetrics, e = s.metricsRepo.GetReviewMetrics(ctx, vendorID)
		if e != nil { errCh <- fmt.Errorf("review_metrics: %w", e) }
	}()

	// Task 2: Recent Activity (Reviews)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var e error
		recentReviews, e = s.dataRepo.GetRecentReviews(ctx, vendorID, 5)
		if e != nil { errCh <- fmt.Errorf("recent_reviews: %w", e) }
	}()

	// Task 3: Recent Activity (Inquiries)
	wg.Add(1)
	go func() {
		defer wg.Done()
		var e error
		recentInquiries, e = s.dataRepo.GetRecentInquiries(ctx, vendorID, 5)
		if e != nil { errCh <- fmt.Errorf("recent_inquiries: %w", e) }
	}()

	// Task 4: 7-Day Performance Window
	wg.Add(1)
	go func() {
		defer wg.Done()
		in7, _ = s.metricsRepo.GetInquiryCountByPeriod(ctx, vendorID, 7)
		rev7, _ = s.metricsRepo.GetReviewCountByPeriod(ctx, vendorID, 7)
		avg7, _ = s.metricsRepo.GetAverageRatingByPeriod(ctx, vendorID, 7)
	}()

	// Task 5: 30-Day Performance Window
	wg.Add(1)
	go func() {
		defer wg.Done()
		in30, _ = s.metricsRepo.GetInquiryCountByPeriod(ctx, vendorID, 30)
		rev30, _ = s.metricsRepo.GetReviewCountByPeriod(ctx, vendorID, 30)
		avg30, _ = s.metricsRepo.GetAverageRatingByPeriod(ctx, vendorID, 30)
	}()

	wg.Wait()
	close(errCh)

	// PHASE 3: Safety & Aggregation
	if reviewMetrics == nil {
		reviewMetrics = &models.ReviewMetricsRaw{RatingCounts: make(map[int]int)}
	}

	// Final Data Mapping (Using internal helper methods)
	fullAnalytics := &models.VendorAnalyticsResponse{
		VendorID:    vendorInfo.ID.String(),
		VendorName:  vendorInfo.Name,
		Category:    vendorInfo.Category,
		Overview:    s.calculateOverview(vendorInfo, trustScore),
		Inquiries:   s.calculateInquiries(recentInquiries, in7, in30),
		Reviews:     s.calculateReviews(reviewMetrics, recentReviews),
		Trends:      s.calculateTrends(in7, rev7, avg7, in30, rev30, avg30),
		Performance: s.calculatePerformance(vendorInfo, trustScore),
	}

	return s.ApplyTierRestrictions(ctx, vendorID, fullAnalytics)
}