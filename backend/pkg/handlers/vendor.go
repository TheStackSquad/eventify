//backend/pkg/handlers/vendor.go


package handlers

import (
	"net/http"
	// "strconv" //imported but not used

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"
	// "eventify/backend/pkg/repository" //imported but not used

	"github.com/rs/zerolog/log"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VendorHandler holds dependencies required by the handlers.
// Now uses the service layer instead of direct repository access.
type VendorHandler struct {
	VendorService services.VendorService // Use service layer instead of repo
}

// NewVendorHandler creates a new handler instance with service layer.
func NewVendorHandler(vendorService services.VendorService) *VendorHandler {
	return &VendorHandler{VendorService: vendorService}
}

// RegisterVendor handles POST /api/v1/vendors/register
func (h *VendorHandler) RegisterVendor(c *gin.Context) {
	var vendor models.Vendor

	var bindVendor struct {
		models.Vendor
		MinPrice int `json:"minPrice"`
	}

	// Log the incoming request
	log.Info().Msg("Received vendor registration request")

	if err := c.ShouldBindJSON(&bindVendor); err != nil {
		log.Error().Err(err).Msg("JSON binding failed for vendor registration")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input format or missing required fields."})
		return
	}

	vendor = bindVendor.Vendor

	// Log the received data (excluding sensitive info)
	log.Info().
		Str("name", vendor.Name).
		Str("category", vendor.Category).
		Str("state", vendor.State).
		Str("city", vendor.City).
		Msg("Processing vendor registration")

	// Use service layer to create vendor (handles PVS calculation internally)
	vendorID, err := h.VendorService.CreateVendor(c.Request.Context(), &vendor)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create vendor")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register vendor profile."})
		return
	}

	log.Info().Str("vendorID", vendorID).Msg("Vendor registered successfully")

	// REMOVED MANUAL CORS HEADERS (lines ~56-58)
	// c.Header("Access-Control-Allow-Origin", "*")
	// c.Header("Access-Control-Allow-Methods", "POST, OPTIONS")
	// c.Header("Access-Control-Allow-Headers", "Content-Type")

	c.JSON(http.StatusCreated, gin.H{
		"message": "Vendor profile created. Pending verification.",
		"vendor_id": vendorID,
	})
}

// ListVendors handles GET /api/v1/vendors to retrieve filtered public listings.
func (h *VendorHandler) ListVendors(c *gin.Context) {
	// Log the full request details
	log.Info().
		Str("method", c.Request.Method).
		Str("path", c.Request.URL.Path).
		Str("query", c.Request.URL.RawQuery).
		Str("full_url", c.Request.URL.String()).
		Msg("🎯 ListVendors handler called")

	// Extract optional query parameters for filtering
	state := c.Query("state")
	category := c.Query("category")
	city := c.Query("city")
	area := c.Query("area")
	minPriceStr := c.Query("minPrice")

	// Build filters map (all values as strings for repository compatibility)
	filters := make(map[string]interface{})

	if state != "" {
		filters["state"] = state
	}
	if category != "" {
		filters["category"] = category
	}
	if city != "" {
		filters["city"] = city
	}
	if area != "" {
		filters["area"] = area
	}
	if minPriceStr != "" {
		filters["min_price"] = minPriceStr // Keep as string for repository
	}

	log.Info().
		Str("state", state).
		Str("category", category).
		Str("city", city).
		Str("area", area).
		Str("minPrice", minPriceStr).
		Interface("filters", filters).
		Msg("🔍 Fetching vendors with filters")

	// Use service layer to get vendors
	vendors, err := h.VendorService.GetVendors(c.Request.Context(), filters)
	if err != nil {
		log.Error().Err(err).Msg("❌ Failed to fetch vendors")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vendor list due to internal error."})
		return
	}

	log.Info().Int("count", len(vendors)).Msg("✅ Vendors fetched successfully")

	// REMOVED MANUAL CORS HEADERS (lines ~119-121)
	// c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
	// c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	// c.Header("Access-Control-Allow-Headers", "Content-Type")

	if len(vendors) == 0 {
		log.Info().Msg("📭 No vendors found, returning empty array")
		c.JSON(http.StatusOK, []models.Vendor{}) // Return empty array for consistency
		return
	}

	log.Info().Int("vendors_count", len(vendors)).Msg("📦 Sending vendors response")
	c.JSON(http.StatusOK, vendors)
}

// GetVendorProfile handles GET /api/v1/vendors/:id to retrieve a single vendor's public profile.
func (h *VendorHandler) GetVendorProfile(c *gin.Context) {
	vendorID := c.Param("id")

	// Validate vendor ID format
	if _, err := primitive.ObjectIDFromHex(vendorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID format."})
		return
	}

	vendor, err := h.VendorService.GetVendorByID(c.Request.Context(), vendorID)
	if err != nil {
		log.Error().Err(err).Str("vendorID", vendorID).Msg("Vendor not found")
		c.JSON(http.StatusNotFound, gin.H{"error": "Vendor profile not found."})
		return
	}

	// REMOVED MANUAL CORS HEADERS (lines ~143-145)
	// c.Header("Access-Control-Allow-Origin", "*")
	// c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	// c.Header("Access-Control-Allow-Headers", "Content-Type")

	c.JSON(http.StatusOK, vendor)
}

// UpdateVendor handles PUT /api/v1/vendors/:id
func (h *VendorHandler) UpdateVendor(c *gin.Context) {
	vendorID := c.Param("id")

	// Validate vendor ID format
	if _, err := primitive.ObjectIDFromHex(vendorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID format."})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Use service layer to update vendor (handles PVS recalculation if needed)
	err := h.VendorService.UpdateVendor(c.Request.Context(), vendorID, updates)
	if err != nil {
		log.Error().Err(err).Str("vendorID", vendorID).Msg("Failed to update vendor")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update vendor: " + err.Error()})
		return
	}

	// REMOVED MANUAL CORS HEADERS (lines ~167-169)
	// c.Header("Access-Control-Allow-Origin", "*")
	// c.Header("Access-Control-Allow-Methods", "PUT, OPTIONS")
	// c.Header("Access-Control-Allow-Headers", "Content-Type")

	c.JSON(http.StatusOK, gin.H{
		"message": "Vendor updated successfully",
	})
}

// ----------------------------------------------------------------------
// ADMIN ENDPOINTS (Requires Admin Auth Middleware for security)
// ----------------------------------------------------------------------

// ToggleIdentityVerification handles PUT /api/v1/admin/vendors/:id/verify/identity.
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

	// Use service layer for verification update
	err := h.VendorService.UpdateVerificationStatus(c.Request.Context(), vendorID, "is_identity_verified", req.IsVerified, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update identity verification status"})
		return
	}

	// Recalculate PVS score after verification change
	err = h.VendorService.CalculateAndUpdatePVS(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update PVS score"})
		return
	}

	// REMOVED MANUAL CORS HEADERS (lines ~194-196)
	// c.Header("Access-Control-Allow-Origin", "*")
	// c.Header("Access-Control-Allow-Methods", "PUT, OPTIONS")
	// c.Header("Access-Control-Allow-Headers", "Content-Type")

	c.JSON(http.StatusOK, gin.H{
		"message": "Identity verification updated successfully.",
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

	// Use service layer for verification update
	err := h.VendorService.UpdateVerificationStatus(c.Request.Context(), vendorID, "is_business_registered", req.IsVerified, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update business verification status"})
		return
	}

	// Recalculate PVS score after verification change
	err = h.VendorService.CalculateAndUpdatePVS(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update PVS score"})
		return
	}

	// REMOVED MANUAL CORS HEADERS (lines ~220-222)
	// c.Header("Access-Control-Allow-Origin", "*")
	// c.Header("Access-Control-Allow-Methods", "PUT, OPTIONS")
	// c.Header("Access-Control-Allow-Headers", "Content-Type")

	c.JSON(http.StatusOK, gin.H{
		"message": "Business verification updated successfully.",
	})
}

// DeleteVendor handles DELETE /api/v1/admin/vendors/:id to permanently remove a vendor.
func (h *VendorHandler) DeleteVendor(c *gin.Context) {
	vendorID := c.Param("id")

	// Validate vendor ID format
	if _, err := primitive.ObjectIDFromHex(vendorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID format."})
		return
	}

	err := h.VendorService.DeleteVendor(c.Request.Context(), vendorID)
	if err != nil {
		log.Error().Err(err).Str("vendorID", vendorID).Msg("Failed to delete vendor")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete vendor profile."})
		return
	}

	// REMOVED MANUAL CORS HEADERS (lines ~247-249)
	// c.Header("Access-Control-Allow-Origin", "*")
	// c.Header("Access-Control-Allow-Methods", "DELETE, OPTIONS")
	// c.Header("Access-Control-Allow-Headers", "Content-Type")

	c.JSON(http.StatusOK, gin.H{"message": "Vendor profile deleted successfully."})
}
