//backend/pkg/handlers/vendor.go

package handlers

import (
	//"context" // Required for c.Request.Context()
	"net/http"

	"strconv" 
	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"
	// Repository import is essential for Dependency Injection:
	"eventify/backend/pkg/repository"
	"github.com/rs/zerolog/log" 
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VendorHandler holds dependencies required by the handlers.
// The Repo field uses an interface (VendorRepository) to interact with the database.
type VendorHandler struct {
	Repo repository.VendorRepository // Interface for DB access
}

// NewVendorHandler creates a new handler instance.
func NewVendorHandler(repo repository.VendorRepository) *VendorHandler {
	return &VendorHandler{Repo: repo}
}

// ----------------------------------------------------------------------
// PUBLIC ENDPOINTS (Accessed by general users for the listing page)
// ----------------------------------------------------------------------

// RegisterVendor handles POST /api/v1/vendors/register to create a new vendor profile.
func (h *VendorHandler) RegisterVendor(c *gin.Context) {
	var vendor models.Vendor
	
	// Temporarily bind into a struct where MinPrice is a string to allow the string value from the client
	var bindVendor struct {
		models.Vendor
		MinPrice string `json:"minPrice"` // Override MinPrice to accept string
	}
	
	// 2. BIND: Bind the JSON into the temporary struct
	if err := c.ShouldBindJSON(&bindVendor); err != nil {
		log.Error().Err(err).Msg("JSON binding failed for vendor registration")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input format or missing required fields."})
		return
	}
    
    // Copy all fields from the temporary struct
    vendor = bindVendor.Vendor

	// 3. CONVERSION: Convert string price to integer after successful binding
	priceInt, err := strconv.Atoi(bindVendor.MinPrice)
	if err != nil {
		// Log the failed conversion
		log.Error().Err(err).Msg("Failed to convert minPrice string to int")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid price format. Price must be a whole number."})
		return
	}
    
    // 4. FIX: Store the converted integer value back into the vendor struct's MinPrice field
    // (Assuming MinPrice is an 'int' in the final models.Vendor struct again)
    vendor.MinPrice = priceInt
	
	// 5. Initialize PVS flags and calculate initial PVS 
	vendor.IsIdentityVerified = false
	vendor.IsBusinessRegistered = false
	
	// FIX: Call CalculatePVS with the correct single argument. 
    // It will read the converted price from vendor.MinPrice
	vendor.PVSScore = services.CalculatePVS(&vendor) 
	
	// 6. Insert the new vendor document into the database
	insertedID, err := h.Repo.Create(c.Request.Context(), &vendor)
	if err != nil {
		log.Error().Err(err).Msg("Failed to insert new vendor document")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register vendor profile."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Vendor profile created. Pending verification.",
		"vendor_id": insertedID.Hex(),
	})
}

// ListVendors handles GET /api/v1/vendors to retrieve filtered public listings.
func (h *VendorHandler) ListVendors(c *gin.Context) {
	// Extract optional query parameters for filtering (Nigerian-specific: state, category)
	state := c.DefaultQuery("state", "")
	category := c.DefaultQuery("category", "")

	// NOTE: The repository layer handles the crucial filtering: PVS Score > 40 OR IsBusinessRegistered=true.

	filters := map[string]interface{}{
		"state": state,
		"category": category,
	}

	// Use the request context for database operations
	vendors, err := h.Repo.FindPublicVendors(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vendor list due to internal error."})
		return
	}

	if len(vendors) == 0 {
		c.JSON(http.StatusOK, []models.Vendor{}) // Return empty array for consistency
		return
	}

	c.JSON(http.StatusOK, vendors)
}

// GetVendorProfile handles GET /api/v1/vendors/:id to retrieve a single vendor's public profile.
func (h *VendorHandler) GetVendorProfile(c *gin.Context) {
	vendorID := c.Param("id")

	// Convert the string ID from the URL to a MongoDB ObjectID
	_, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID format."})
		return
	}

	vendor, err := h.Repo.GetByID(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vendor profile not found."})
		return
	}

	// The frontend will render the profile details, including the PVSScore and verification status.
	c.JSON(http.StatusOK, vendor)
}

// ----------------------------------------------------------------------
// ADMIN ENDPOINTS (Requires Admin Auth Middleware for security)
// ----------------------------------------------------------------------

// ToggleIdentityVerification handles PUT /api/v1/admin/vendors/:id/verify/identity.
func (h *VendorHandler) ToggleIdentityVerification(c *gin.Context) {
	vendorID := c.Param("id")

	// The request assumes admin passes the verification status (true/false) and a rejection reason.
	var req struct {
		IsVerified bool   `json:"is_verified"`
		Reason     string `json:"reason,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 1. Database Update (Update the verification flag)
	err := h.Repo.UpdateVerificationFlag(c.Request.Context(), vendorID, "is_identity_verified", req.IsVerified, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update identity verification status"})
		return
	}

	// 2. Fetch the newly updated vendor document (to get all current PVS factors)
	vendor, err := h.Repo.GetByID(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve vendor after update"})
		return
	}

	// 3. CRITICAL: Calculate the new PVS Score based on the current state
	newScore := services.CalculatePVS(&vendor)

	// 4. Save the new PVS Score to the database
	err = h.Repo.UpdatePVSScore(c.Request.Context(), vendorID, newScore)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update PVS score"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Identity verification and PVS score updated successfully.",
		"new_score": newScore,
	})
}

// ToggleBusinessVerification handles PUT /api/v1/admin/vendors/:id/verify/business.
func (h *VendorHandler) ToggleBusinessVerification(c *gin.Context) {
	vendorID := c.Param("id")

	var req struct {
		IsVerified bool   `json:"is_verified"`
		Reason     string `json:"reason,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 1. Database Update: Target the business registration flag
	err := h.Repo.UpdateVerificationFlag(c.Request.Context(), vendorID, "is_business_registered", req.IsVerified, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update business verification status"})
		return
	}

	// 2. Fetch the newly updated vendor document
	vendor, err := h.Repo.GetByID(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve vendor after update"})
		return
	}

	// 3. CRITICAL: Calculate the new PVS Score
	newScore := services.CalculatePVS(&vendor)

	// 4. Save the new PVS Score to the database
	err = h.Repo.UpdatePVSScore(c.Request.Context(), vendorID, newScore)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update PVS score"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Business verification and PVS score updated successfully.",
		"new_score": newScore,
	})
}

// DeleteVendor handles DELETE /api/v1/admin/vendors/:id to permanently remove a vendor.
func (h *VendorHandler) DeleteVendor(c *gin.Context) {
	vendorID := c.Param("id")

	// Convert the string ID from the URL to a MongoDB ObjectID
	_, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID format."})
		return
	}

	// The repository handles the actual deletion.
	deletedCount, err := h.Repo.Delete(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete vendor profile."})
		return
	}

	if deletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Vendor profile not found."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vendor profile deleted successfully."})
}

