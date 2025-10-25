//backend/pkg/services/inquiries_services.go
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

// InquiryService defines the service interface for inquiries.
type InquiryService interface {
	CreateInquiry(ctx context.Context, inquiry *models.Inquiry) error
	GetInquiriesByVendor(ctx context.Context, vendorID string) ([]models.Inquiry, error)
	UpdateInquiryStatus(ctx context.Context, inquiryID, status, response string) error
	DeleteInquiry(ctx context.Context, id string) error
}

// inquiryService implements InquiryService.
type inquiryService struct {
	InquiryRepo repository.InquiryRepository
	VendorRepo repository.VendorRepository
}

// NewInquiryService returns a new InquiryService instance.
func NewInquiryService(inquiryRepo repository.InquiryRepository, vendorRepo repository.VendorRepository) InquiryService {
	return &inquiryService{
		InquiryRepo: inquiryRepo,
		VendorRepo: vendorRepo,
	}
}

// CreateInquiry handles validation, saving, and updating vendor inquiry count.
func (s *inquiryService) CreateInquiry(ctx context.Context, inquiry *models.Inquiry) error {
	if inquiry.VendorID.IsZero() {
		return errors.New("vendor ID is required")
	}

	inquiry.ID = primitive.NewObjectID()
	inquiry.CreatedAt = time.Now()
	inquiry.UpdatedAt = time.Now()

	// Save inquiry
	err := s.InquiryRepo.Create(ctx, inquiry)
	if err != nil {
		log.Error().Err(err).Msg("failed to create inquiry")
		return err
	}

	// Increment vendor inquiry count
	err = s.VendorRepo.IncrementField(ctx, inquiry.VendorID, "inquiry_count", 1)
	if err != nil {
		log.Error().Err(err).Msg("failed to increment vendor inquiry count")
	}

	return nil
}

// GetInquiriesByVendor fetches all inquiries linked to a vendor.
func (s *inquiryService) GetInquiriesByVendor(ctx context.Context, vendorID string) ([]models.Inquiry, error) {
	if vendorID == "" {
		return nil, errors.New("vendor ID required")
	}

	objID, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		return nil, errors.New("invalid vendor ID format")
	}

	inquiries, err := s.InquiryRepo.GetByVendorID(ctx, objID)
	if err != nil {
		log.Error().Err(err).Str("vendorID", vendorID).Msg("failed to fetch inquiries")
		return nil, err
	}

	return inquiries, nil
}

// UpdateInquiryStatus handles updating the status and response of an inquiry.
func (s *inquiryService) UpdateInquiryStatus(ctx context.Context, inquiryID, status, response string) error {
	objID, err := primitive.ObjectIDFromHex(inquiryID)
	if err != nil {
		return errors.New("invalid inquiry ID format")
	}

	// Create a map of fields to update
	updateFields := map[string]interface{}{
		"status": status,
		"response": response,
		"updated_at": time.Now(),
	}

	// Assuming InquiryRepo has an UpdateFields method for partial updates
	// If your repository uses a different method (like a full 'Update'), adjust this.
	err = s.InquiryRepo.UpdateFields(ctx, objID, updateFields)
	if err != nil {
		log.Error().Err(err).Str("inquiryID", inquiryID).Msg("Failed to update inquiry status in repository")
		return err
	}

	return nil
}

// DeleteInquiry removes an inquiry and optionally decrements vendor count.
func (s *inquiryService) DeleteInquiry(ctx context.Context, id string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid inquiry ID format")
	}

	inquiry, err := s.InquiryRepo.FindByID(ctx, objID)
	if err != nil {
		log.Error().Err(err).Str("inquiryID", id).Msg("failed to find inquiry before deletion")
		return err
	}

	err = s.InquiryRepo.Delete(ctx, objID)
	if err != nil {
		log.Error().Err(err).Str("inquiryID", id).Msg("failed to delete inquiry")
		return err
	}

	// Decrement vendor inquiry count
	err = s.VendorRepo.IncrementField(ctx, inquiry.VendorID, "inquiry_count", -1)
	if err != nil {
		log.Error().Err(err).Str("vendorID", inquiry.VendorID.Hex()).Msg("failed to decrement vendor inquiry count")
	}

	return nil
}
