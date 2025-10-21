//backend/pkg/services/vendor_services.go

package services

import (
	"context"
	"errors"
//	"fmt"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/repository"
)

// Revised Weights (Total 100 points) for PVS calculation, excluding portfolio.
const (
	WeightIdentity        = 20
	WeightRegistration    = 20
	WeightProfileComplete = 10
	WeightResponseRate    = 20
	WeightBookingSuccess  = 30
    MaxBookingsForPoints  = 6 // Max 6 bookings (6 * 5 points/booking = 30)
    PointsPerBooking      = 5
)

// CalculatePVS runs the Platform Verified Score (PVS) logic on a vendor struct
// and returns the new objective score (0-100).
func CalculatePVS(v *models.Vendor) int {
	score := 0

	// 1. Identity and Business Verification (Max 40 points)
	if v.IsIdentityVerified {
		score += WeightIdentity
	}
	if v.IsBusinessRegistered {
		score += WeightRegistration
	}

	// 2. Profile Completeness (Max 10 points)
    // ProfileCompletion is assumed to be a float32 between 0.0 and 1.0.
    // We cast the weighted score to an integer for the final score.
	score += int(float32(WeightProfileComplete) * v.ProfileCompletion)

	// 3. Response Rate (Max 20 points)
	if v.InquiryCount > 0 {
		// Calculate the actual response rate (0.0 to 1.0)
		responseRate := float32(v.RespondedCount) / float32(v.InquiryCount)
		// Apply the rate to the maximum possible points for this component
		score += int(float32(WeightResponseRate) * responseRate)
	}

	// 4. Booking Success History (Max 30 points)
    // Points are capped at the WeightBookingSuccess.
    successPoints := v.BookingsCompleted * PointsPerBooking

    if successPoints > WeightBookingSuccess {
        successPoints = WeightBookingSuccess
    }

    score += successPoints

	// Ensure the score is within the 0-100 range, although our calculation should prevent overflow.
    if score > 100 {
        return 100
    }

	return score
}

// VendorService defines the business logic operations for vendors
type VendorService interface {
	// Read operations
	GetVendors(ctx context.Context, filters map[string]interface{}) ([]models.Vendor, error)
	GetVendorByID(ctx context.Context, id string) (models.Vendor, error)
	
	// Write operations  
	CreateVendor(ctx context.Context, vendor *models.Vendor) (string, error)
	UpdateVendor(ctx context.Context, id string, updates map[string]interface{}) error
	DeleteVendor(ctx context.Context, id string) error
	
	// Business logic operations
	CalculateAndUpdatePVS(ctx context.Context, vendorID string) error
	UpdateVerificationStatus(ctx context.Context, vendorID string, field string, isVerified bool, reason string) error
}

// VendorServiceImpl is the concrete implementation of VendorService
type VendorServiceImpl struct {
	vendorRepo repository.VendorRepository
}

// NewVendorService creates a new vendor service instance
func NewVendorService(vendorRepo repository.VendorRepository) *VendorServiceImpl {
	return &VendorServiceImpl{
		vendorRepo: vendorRepo,
	}
}

// GetVendors retrieves vendors with optional filters and applies business rules
func (s *VendorServiceImpl) GetVendors(ctx context.Context, filters map[string]interface{}) ([]models.Vendor, error) {
	// Apply business logic to filters before passing to repository
	processedFilters := s.processFilters(filters)
	
	vendors, err := s.vendorRepo.FindPublicVendors(ctx, processedFilters)
	if err != nil {
		return nil, err
	}
	
	// Apply any additional business logic to the results
	return s.enrichVendorData(vendors), nil
}

// GetVendorByID retrieves a single vendor by ID
func (s *VendorServiceImpl) GetVendorByID(ctx context.Context, id string) (models.Vendor, error) {
	if id == "" {
		return models.Vendor{}, errors.New("vendor ID is required")
	}
	
	vendor, err := s.vendorRepo.GetByID(ctx, id)
	if err != nil {
		return models.Vendor{}, err
	}
	
	return vendor, nil
}

// CreateVendor creates a new vendor and calculates initial PVS score
func (s *VendorServiceImpl) CreateVendor(ctx context.Context, vendor *models.Vendor) (string, error) {
	// Set default values for new vendors
	vendor.IsIdentityVerified = false  // Not verified initially
	vendor.IsBusinessRegistered = false // Not registered initially  
	vendor.ProfileCompletion = 0.3     // Basic profile completion
	vendor.PVSScore = 0                // Initial PVS score
	vendor.InquiryCount = 0
	vendor.RespondedCount = 0
	vendor.BookingsCompleted = 0
	vendor.ReviewCount = 0

	// Calculate initial PVS score (will be low since not verified)
	vendor.PVSScore = CalculatePVS(vendor)
	
	// Create vendor in repository
	vendorID, err := s.vendorRepo.Create(ctx, vendor)
	if err != nil {
		return "", err
	}
	
	return vendorID.Hex(), nil
}

// UpdateVendor updates vendor fields and recalculates PVS score if needed
func (s *VendorServiceImpl) UpdateVendor(ctx context.Context, id string, updates map[string]interface{}) error {
	// Get current vendor to determine if PVS needs recalculation
	currentVendor, err := s.vendorRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	
	// Check if any PVS-relevant fields are being updated
	needsPVSRecalculation := s.needsPVSRecalculation(updates)
	
	// If PVS needs recalculation, calculate new score and add to updates
	if needsPVSRecalculation {
		// Create a temporary vendor with updated values for calculation
		tempVendor := currentVendor
		s.applyUpdatesToVendor(&tempVendor, updates)
		
		newScore := CalculatePVS(&tempVendor)
		updates["pvs_score"] = newScore
	}
	
	// For now, we'll use individual repo methods. In a real implementation,
	// you might want to add a bulk update method to the repository.
	// This is a simplified implementation.
	
	// Handle specific field updates that have dedicated repo methods
	if isVerified, exists := updates["is_identity_verified"]; exists {
		if isVerifiedBool, ok := isVerified.(bool); ok {
			return s.vendorRepo.UpdateVerificationFlag(ctx, id, "is_identity_verified", isVerifiedBool, "admin_update")
		}
	}
	
	if isRegistered, exists := updates["is_business_registered"]; exists {
		if isRegisteredBool, ok := isRegistered.(bool); ok {
			return s.vendorRepo.UpdateVerificationFlag(ctx, id, "is_business_registered", isRegisteredBool, "admin_update")
		}
	}
	
	if pvsScore, exists := updates["pvs_score"]; exists {
		if pvsScoreInt, ok := pvsScore.(int); ok {
			return s.vendorRepo.UpdatePVSScore(ctx, id, pvsScoreInt)
		}
	}
	
	// For other fields, we'd need a generic update method in the repository
	// For now, return an error indicating this field isn't supported
	return errors.New("update field not supported in current implementation")
}

// DeleteVendor deletes a vendor by ID
func (s *VendorServiceImpl) DeleteVendor(ctx context.Context, id string) error {
	deletedCount, err := s.vendorRepo.Delete(ctx, id)
	if err != nil {
		return err
	}
	
	if deletedCount == 0 {
		return errors.New("vendor not found")
	}
	
	return nil
}

// CalculateAndUpdatePVS recalculates and updates the PVS score for a vendor
func (s *VendorServiceImpl) CalculateAndUpdatePVS(ctx context.Context, vendorID string) error {
	vendor, err := s.vendorRepo.GetByID(ctx, vendorID)
	if err != nil {
		return err
	}
	
	newScore := CalculatePVS(&vendor)
	return s.vendorRepo.UpdatePVSScore(ctx, vendorID, newScore)
}

// UpdateVerificationStatus updates verification flags with a reason
func (s *VendorServiceImpl) UpdateVerificationStatus(ctx context.Context, vendorID string, field string, isVerified bool, reason string) error {
	return s.vendorRepo.UpdateVerificationFlag(ctx, vendorID, field, isVerified, reason)
}

// Helper methods

// processFilters applies business logic to filter parameters
func (s *VendorServiceImpl) processFilters(filters map[string]interface{}) map[string]interface{} {
	processed := make(map[string]interface{})
	
	for key, value := range filters {
		// Handle different filter types
		switch key {
		case "min_price":
			// Ensure numeric filters are properly handled
			if minPrice, ok := value.(string); ok && minPrice != "" {
				processed["min_price"] = minPrice
			}
		case "category", "state", "city", "area":
			// String filters
			if strVal, ok := value.(string); ok && strVal != "" {
				processed[key] = strVal
			}
		default:
			// Include other filters as-is
			processed[key] = value
		}
	}
	
	return processed
}

// enrichVendorData applies additional business logic to vendor results
func (s *VendorServiceImpl) enrichVendorData(vendors []models.Vendor) []models.Vendor {
	// For now, return as-is. This method can be used to:
	// - Add calculated fields
	// - Apply formatting
	// - Filter sensitive data
	// - Add aggregate data from other services
	return vendors
}

// needsPVSRecalculation checks if any updated fields affect the PVS score
func (s *VendorServiceImpl) needsPVSRecalculation(updates map[string]interface{}) bool {
	pvsRelevantFields := map[string]bool{
		"is_identity_verified":   true,
		"is_business_registered": true,
		"profile_completion":     true,
		"inquiry_count":          true,
		"responded_count":        true,
		"bookings_completed":     true,
	}
	
	for field := range updates {
		if pvsRelevantFields[field] {
			return true
		}
	}
	
	return false
}

// applyUpdatesToVendor applies update values to a vendor struct for PVS calculation
func (s *VendorServiceImpl) applyUpdatesToVendor(vendor *models.Vendor, updates map[string]interface{}) {
	for field, value := range updates {
		switch field {
		case "is_identity_verified":
			if v, ok := value.(bool); ok {
				vendor.IsIdentityVerified = v
			}
		case "is_business_registered":
			if v, ok := value.(bool); ok {
				vendor.IsBusinessRegistered = v
			}
		case "profile_completion":
			if v, ok := value.(float32); ok {
				vendor.ProfileCompletion = v
			}
		case "inquiry_count":
			if v, ok := value.(int); ok {
				vendor.InquiryCount = v
			}
		case "responded_count":
			if v, ok := value.(int); ok {
				vendor.RespondedCount = v
			}
		case "bookings_completed":
			if v, ok := value.(int); ok {
				vendor.BookingsCompleted = v
			}
		}
	}
}

// GetVendorsWithVerification gets vendors with optional verification filter
func (s *VendorServiceImpl) GetVendorsWithVerification(ctx context.Context, filters map[string]interface{}, includeUnverified bool) ([]models.Vendor, error) {
	processedFilters := s.processFilters(filters)
	
	// If we want to filter by verification status
	if !includeUnverified {
		processedFilters["is_identity_verified"] = true
	}
	
	vendors, err := s.vendorRepo.FindPublicVendors(ctx, processedFilters)
	if err != nil {
		return nil, err
	}
	
	return vendors, nil
}

// VerifyVendorIdentity verifies a vendor's identity (admin function)
func (s *VendorServiceImpl) VerifyVendorIdentity(ctx context.Context, vendorID string, adminID string, notes string) error {
	return s.vendorRepo.UpdateVerificationFlag(ctx, vendorID, "is_identity_verified", true, "Verified by admin: "+adminID+". Notes: "+notes)
}

// VerifyBusinessRegistration verifies a vendor's business registration (admin function)
func (s *VendorServiceImpl) VerifyBusinessRegistration(ctx context.Context, vendorID string, adminID string, registrationNumber string) error {
	return s.vendorRepo.UpdateVerificationFlag(ctx, vendorID, "is_business_registered", true, "Business registered: "+registrationNumber+ " by admin: "+adminID)
}