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
	GetApprovedReviewsByVendor(ctx context.Context, vendorID string) ([]models.Review, error)
	CalculateAndUpdateVendorRating(ctx context.Context, vendorID string) error
	UpdateReviewApprovalStatus(ctx context.Context, reviewID primitive.ObjectID, isApproved bool) error
	// ❌ REMOVED FindByID - it's internal only, not exposed to handlers
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

// CreateReview validates input, checks for duplicates, saves the review, and updates vendor stats.
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

	// ✅ FIXED: Validate either UserID or IPAddress exists
	if review.UserID.IsZero() && review.IPAddress == "" {
		return errors.New("either user_id or ip_address must be provided")
	}

	review.CreatedAt = time.Now()
	review.UpdatedAt = time.Now()
	review.IsApproved = false

	// Save review in MongoDB (repository will handle duplicate via upsert)
	if err := s.reviewRepo.Create(ctx, review); err != nil {
		log.Error().Err(err).Msg("Failed to create review")
		return err
	}

	// Update vendor's PVSScore and review count
	if err := s.CalculateAndUpdateVendorRating(ctx, review.VendorID.Hex()); err != nil {
		log.Error().Err(err).Msg("Failed to update vendor PVS score after review")
		// Don't return error - review is already saved
	}

	log.Info().Str("vendorID", review.VendorID.Hex()).Msg("✅ Review created and vendor rating updated")
	return nil
}

// GetReviewsByVendor fetches all reviews for a specific vendor (admin only).
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

// GetApprovedReviewsByVendor fetches only approved reviews for a specific vendor (public).
func (s *reviewServiceImpl) GetApprovedReviewsByVendor(ctx context.Context, vendorID string) ([]models.Review, error) {
	if vendorID == "" {
		return nil, errors.New("vendorID cannot be empty")
	}

	objID, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		return nil, errors.New("invalid vendorID format")
	}

	return s.reviewRepo.GetApprovedByVendorID(ctx, objID)
}

// CalculateAndUpdateVendorRating computes the average rating using ONLY approved reviews.
func (s *reviewServiceImpl) CalculateAndUpdateVendorRating(ctx context.Context, vendorID string) error {
	if vendorID == "" {
		return errors.New("vendorID cannot be empty")
	}

	objID, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		return errors.New("invalid vendorID format")
	}

	// ✅ USE APPROVED REVIEWS ONLY for rating calculation
	reviews, err := s.reviewRepo.GetApprovedByVendorID(ctx, objID)
	if err != nil {
		return err
	}

	if len(reviews) == 0 {
		// If no approved reviews, reset vendor rating stats
		return s.vendorRepo.UpdateFields(ctx, vendorID, map[string]interface{}{
			"pvs_score":    0,
			"review_count": 0,
			"updated_at":   time.Now(),
		})
	}

	// Calculate average rating from approved reviews only
	var total float64
	for _, r := range reviews {
		total += float64(r.Rating)
	}
	average := total / float64(len(reviews))

	// Update vendor with new stats
	updateFields := map[string]interface{}{
		"pvs_score":    int(average * 20), // scaled to 0-100 PVS metric
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
		Msg("⭐ Vendor rating updated successfully (approved reviews only)")

	return nil
}

// UpdateReviewApprovalStatus updates the approval status and recalculates vendor rating.
func (s *reviewServiceImpl) UpdateReviewApprovalStatus(ctx context.Context, reviewID primitive.ObjectID, isApproved bool) error {
	// Get the review first to know which vendor to update
	review, err := s.reviewRepo.FindByID(ctx, reviewID)
	if err != nil {
		return err
	}
	if review == nil {
		return errors.New("review not found")
	}

	// Update the approval status in repository
	if err := s.reviewRepo.UpdateApprovalStatus(ctx, reviewID, isApproved); err != nil {
		return err
	}

	// Recalculate and update vendor rating after approval change
	if err := s.CalculateAndUpdateVendorRating(ctx, review.VendorID.Hex()); err != nil {
		log.Error().Err(err).Msg("Failed to recalculate vendor rating after review approval")
		// Don't return error - approval already saved
	}

	return nil
}