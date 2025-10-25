//backend/pkg/handlers/inquiries.go

package handlers

import (
	"net/http"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// InquiryHandler handles inquiry-related routes
type InquiryHandler struct {
	Service services.InquiryService
}

// NewInquiryHandler initializes a new inquiry handler
func NewInquiryHandler(service services.InquiryService) *InquiryHandler {
	return &InquiryHandler{Service: service}
}

// POST /api/vendors/:vendor_id/inquiries
func (h *InquiryHandler) CreateInquiry(c *gin.Context) {
	vendorID := c.Param("vendor_id")
	if vendorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Vendor ID is required"})
		return
	}

	// Convert vendorID string to ObjectID
	vendorObjID, err := primitive.ObjectIDFromHex(vendorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid vendor ID format"})
		return
	}

	var req struct {
		Name    string `json:"name" binding:"required"`
		Email   string `json:"email" binding:"required,email"`
		Phone   string `json:"phone"`
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body", "error": err.Error()})
		return
	}

	inquiry := &models.Inquiry{
		VendorID: vendorObjID,  // ✅ ADD THIS LINE
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Message:  req.Message,
		Status:   "pending",
	}

	if err := h.Service.CreateInquiry(c.Request.Context(), inquiry); err != nil {
		log.Error().Err(err).Msg("failed to create inquiry")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create inquiry"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Inquiry submitted successfully"})
}

// GET /api/vendors/:vendor_id/inquiries
func (h *InquiryHandler) GetVendorInquiries(c *gin.Context) {
	vendorID := c.Param("vendor_id")
	if vendorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Vendor ID is required"})
		return
	}

	inquiries, err := h.Service.GetInquiriesByVendor(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch inquiries"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vendor_id": vendorID,
		"count":     len(inquiries),
		"inquiries": inquiries,
	})
}

// UpdateInquiryStatus handles PUT /api/inquiries/:id/status
func (h *InquiryHandler) UpdateInquiryStatus(c *gin.Context) {
	inquiryID := c.Param("id")
	if inquiryID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Inquiry ID is required"})
		return
	}

	var req struct {
		Status   string `json:"status" binding:"required"`
		Response string `json:"response,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body", "error": err.Error()})
		return
	}

	err := h.Service.UpdateInquiryStatus(c.Request.Context(), inquiryID, req.Status, req.Response)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update inquiry status", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inquiry status updated successfully"})
}


// DELETE /api/inquiries/:id
func (h *InquiryHandler) DeleteInquiry(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Inquiry ID is required"})
		return
	}

	if err := h.Service.DeleteInquiry(c.Request.Context(), id); err != nil {
		log.Error().Err(err).Str("inquiryID", id).Msg("Failed to delete inquiry")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete inquiry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inquiry deleted successfully"})
}
