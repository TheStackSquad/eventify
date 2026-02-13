// backend/pkg/handlers/vendor/vendor_write.go

package vendor

import (
	"net/http"
	"strings"
	"database/sql"

	"github.com/eventify/backend/pkg/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// VendorBinding captures the incoming JSON from Next.js
type VendorBinding struct {
	Name        string `json:"name" binding:"required"`
	Category    string `json:"category" binding:"required"`
	Description string `json:"description"`
	ImageURL    string `json:"imageURL"`
	State       string `json:"state" binding:"required"`
	City        string `json:"city"`
	PhoneNumber string `json:"phoneNumber" binding:"required"`
	Email       string `json:"email"`
	MinPrice    int32  `json:"minPrice"`

	// Identity (vNIN)
	VNIN               string `json:"vnin" binding:"required"`
	VerifiedVNIN       string `json:"verifiedVnin" binding:"required"`
	IsIdentityVerified bool   `json:"isIdentityVerified"`
	FirstName          string `json:"firstName"`
	MiddleName         string `json:"middleName"`
	LastName           string `json:"lastName"`

	// Business (CAC)
	CACNumber          string `json:"cacNumber"`
	VerifiedCACNumber  string `json:"verifiedCacNumber"`
	IsBusinessVerified bool   `json:"isBusinessVerified"`
	Status             string `json:"status"`
}

// convertNairaToKobo converts Naira to Kobo (multiply by 100)
func convertNairaToKobo(naira int32) int32 {
	return naira * 100
}

func (h *VendorHandler) RegisterVendor(c *gin.Context) {
	var input VendorBinding
	if err := c.ShouldBindJSON(&input); err != nil {
		log.Warn().Err(err).Msg("Invalid vendor registration payload")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
		return
	}

	// 1. SECURITY: Tamper-proof check for vNIN
	if input.VNIN != input.VerifiedVNIN {
		log.Warn().Msg("vNIN verification mismatch attempt")
		c.JSON(http.StatusForbidden, gin.H{"error": "Identity verification mismatch"})
		return
	}

	// 2. Auth: Get User ID from Middleware
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}
	ownerID := userIDVal.(uuid.UUID)

	// 3. Logic: Check if user already has a vendor profile
	existingVendor, _ := h.VendorService.GetVendorByOwnerID(c.Request.Context(), ownerID)
	if existingVendor != nil {
		log.Warn().Str("owner_id", ownerID.String()).Msg("Duplicate vendor registration attempt")
		c.JSON(http.StatusConflict, gin.H{"error": "You already have a vendor profile. Please use the edit function to update it."})
		return
	}

	// 4. Price Conversion: Convert Naira to Kobo
	minPriceKobo := convertNairaToKobo(input.MinPrice)

	// 5. Mapping: Binding -> Model
	vendor := models.Vendor{
		OwnerID:            ownerID,
		Name:               input.Name,
		Category:           input.Category,
		Status:             models.VendorStatusActive,
		IsIdentityVerified: input.IsIdentityVerified,
		State:              input.State,
		Description:        models.ToNullString(input.Description),
		ImageURL:           models.ToNullString(input.ImageURL),
		City:               models.ToNullString(input.City),
		PhoneNumber:        models.ToNullString(input.PhoneNumber),
		Email:              models.ToNullString(input.Email),
		VNIN:               models.ToNullString(input.VNIN),
		FirstName:          models.ToNullString(input.FirstName),
		MiddleName:         models.ToNullString(input.MiddleName),
		LastName:           models.ToNullString(input.LastName),
		CACNumber:          models.ToNullString(input.CACNumber),
		MinPrice:           models.ToNullInt32(minPriceKobo),
		IsBusinessVerified: sql.NullBool{Bool: input.IsBusinessVerified, Valid: true},
	}

	// 6. Execution
	vendorID, err := h.VendorService.CreateVendor(c.Request.Context(), &vendor)
	if err != nil {
		log.Error().Err(err).Str("owner_id", ownerID.String()).Msg("Vendor creation failed")
		if strings.Contains(err.Error(), "unique constraint") {
			c.JSON(http.StatusConflict, gin.H{"error": "vNIN or Business Name already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Registration failed"})
		return
	}

	log.Info().Str("vendor_id", vendorID).Str("vendor_name", input.Name).Msg("Vendor registered successfully")
	c.JSON(http.StatusCreated, gin.H{
		"vendor_id": vendorID,
		"message":   "Vendor profile created successfully!",
	})
}

func (h *VendorHandler) UpdateVendor(c *gin.Context) {
	vendorIDStr := c.Param("id") // Get as string
	userIDVal, _ := c.Get("user_id")
	requestorID := userIDVal.(uuid.UUID)

	var input VendorBinding
	if err := c.ShouldBindJSON(&input); err != nil {
		log.Warn().Err(err).Str("vendor_id", vendorIDStr).Msg("Invalid update payload")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid update data"})
		return
	}

	// Validate and default status
	status := models.VendorStatus(input.Status)
	if status == "" {
		status = models.VendorStatusActive
	}

	validStatuses := map[models.VendorStatus]bool{
		models.VendorStatusActive:    true,
		models.VendorStatusSuspended: true,
		models.VendorStatusDeleted:   true,
	}
	if !validStatuses[status] {
		log.Warn().Str("status", string(status)).Msg("Invalid vendor status")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor status"})
		return
	}

	// Price Conversion: Convert Naira to Kobo
	minPriceKobo := convertNairaToKobo(input.MinPrice)

	updatedVendor := models.Vendor{
		Name:               input.Name,
		Category:           input.Category,
		State:              input.State,
		Status:             status,
		IsIdentityVerified: input.IsIdentityVerified,
		Description:        models.ToNullString(input.Description),
		ImageURL:           models.ToNullString(input.ImageURL),
		City:               models.ToNullString(input.City),
		PhoneNumber:        models.ToNullString(input.PhoneNumber),
		Email:              models.ToNullString(input.Email),
		VNIN:               models.ToNullString(input.VNIN),
		FirstName:          models.ToNullString(input.FirstName),
		MiddleName:         models.ToNullString(input.MiddleName),
		LastName:           models.ToNullString(input.LastName),
		CACNumber:          models.ToNullString(input.CACNumber),
		MinPrice:           models.ToNullInt32(minPriceKobo),
		IsBusinessVerified: sql.NullBool{Bool: input.IsBusinessVerified, Valid: true},
	}

	err := h.VendorService.UpdateVendor(c.Request.Context(), vendorIDStr, requestorID, &updatedVendor)

	if err != nil {
		if err.Error() == "unauthorized" {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this profile"})
			return
		}
		log.Error().Err(err).Str("vendor_id", vendorIDStr).Msg("Vendor update failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Return updated vendor data
	refreshed, err := h.VendorService.GetVendorByID(c.Request.Context(), vendorIDStr)
	if err != nil {
		log.Warn().Err(err).Str("vendor_id", vendorIDStr).Msg("Failed to fetch updated vendor")
		c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
		return
	}

	log.Info().Str("vendor_id", vendorIDStr).Msg("Vendor updated successfully")
	c.JSON(http.StatusOK, gin.H{
		"message": "Vendor profile updated successfully!",
		"vendor":  refreshed,
	})
}

func (h *VendorHandler) ToggleIdentityVerification(c *gin.Context) {
	vendorID := c.Param("id")
	var req struct {
		IsVerified bool   `json:"is_verified"`
		Reason     string `json:"reason,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	err := h.VendorService.UpdateVerificationStatus(c.Request.Context(), vendorID, "is_identity_verified", req.IsVerified, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status updated"})
}