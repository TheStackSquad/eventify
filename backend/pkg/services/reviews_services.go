// backend/pkg/services/reviews_service.go

package services

import (
	"context"
	"errors"
	"time"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/repository"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReviewService defines all logic for handling reviews.
type ReviewService interface {
	CreateReview(ctx context.Context, review *models.Review) error
	GetReviewsByVendor(ctx context.Context, vendorID string) ([]models.Review, error)
	CalculateAndUpdateVendorRating(ctx context.Context, vendorID string) error
}

// reviewServiceImpl implements ReviewService
type reviewServiceImpl struct {
	reviewRepo repository.ReviewRepository
	vendorRepo repository.VendorRepository
}

// NewReviewService initializes the service with required repositories.
func NewReviewService(reviewRepo repository.ReviewRepository, vendorRepo repository.VendorRepository) ReviewService {
	return &reviewServiceImpl{
		reviewRepo: reviewRepo,
		vendorRepo: vendorRepo,
	}
}

// CreateReview validates input, saves the review, and updates vendor stats.
func (s *reviewServiceImpl) CreateReview(ctx context.Context, review *models.Review) error {
	if review == nil {
		return errors.New("review object is nil")
	}

	if review.VendorID.IsZero() {
		return errors.New("vendor_id is required")
	}

	if review.Rating < 1 || review.Rating > 5 {
		return errors.New("rating must be between 1 and 5")
	}

	review.CreatedAt = time.Now()
	review.UpdatedAt = time.Now()

	// Save review in MongoDB
	if err := s.reviewRepo.Create(ctx, review); err != nil {
		log.Error().Err(err).Msg("Failed to create review")
		return err
	}

	// Update vendor’s PVSScore and review count
	if err := s.CalculateAndUpdateVendorRating(ctx, review.VendorID.Hex()); err != nil {
		log.Error().Err(err).Msg("Failed to update vendor PVS score after review")
		return err
	}

	log.Info().Str("vendorID", review.VendorID.Hex()).Msg("✅ Review created and vendor rating updated")
	return nil
}

// GetReviewsByVendor fetches all reviews for a specific vendor.
func (s *reviewServiceImpl) GetReviewsByVendor(ctx context.Context, vendorID string) ([]models.Review, error) {
	if vendorID == "" {
		return nil, errors.New("vendorID cannot be empty")
	}

	objID, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		return nil, errors.New("invalid vendorID format")
	}

	return s.reviewRepo.GetByVendorID(ctx, objID)
}

// CalculateAndUpdateVendorRating computes the average rating and updates vendor record.
func (s *reviewServiceImpl) CalculateAndUpdateVendorRating(ctx context.Context, vendorID string) error {
	if vendorID == "" {
		return errors.New("vendorID cannot be empty")
	}

	objID, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		return errors.New("invalid vendorID format")
	}

	reviews, err := s.reviewRepo.GetByVendorID(ctx, objID)
	if err != nil {
		return err
	}

	if len(reviews) == 0 {
		// If no reviews, reset vendor rating stats
		return s.vendorRepo.UpdateFields(ctx, vendorID, map[string]interface{}{
			"pvs_score":    0,
			"review_count": 0,
		})
	}

	// Calculate average rating
	var total float64
	for _, r := range reviews {
		total += float64(r.Rating)
	}
	average := total / float64(len(reviews))

	// Update vendor with new stats
	updateFields := map[string]interface{}{
		"pvs_score":    int(average * 20), // scaled if you use a 0–100 PVS metric
		"review_count": len(reviews),
		"updated_at":   time.Now(),
	}

	if err := s.vendorRepo.UpdateFields(ctx, vendorID, updateFields); err != nil {
		return err
	}

	log.Info().
		Str("vendorID", vendorID).
		Float64("average_rating", average).
		Int("review_count", len(reviews)).
		Msg("⭐ Vendor rating updated successfully")

	return nil
}
