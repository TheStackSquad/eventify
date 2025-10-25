// backend/pkg/handlers/reviews_handler.go
package handlers

import (
	"net/http"
	"time"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"
	"eventify/backend/pkg/utils"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReviewHandler handles review-related endpoints
type ReviewHandler struct {
	reviewService services.ReviewService
}

// NewReviewHandler initializes a new review handler
func NewReviewHandler(reviewService services.ReviewService) *ReviewHandler {
	return &ReviewHandler{
		reviewService: reviewService,
	}
}

// CreateReview handles POST /api/vendors/:vendor_id/reviews
func (h *ReviewHandler) CreateReview(c *gin.Context) {
	vendorIDParam := c.Param("vendor_id")
	if vendorIDParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Vendor ID is required"})
		return
	}

	vendorObjectID, err := primitive.ObjectIDFromHex(vendorIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid vendor ID format"})
		return
	}

	var req struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body", "error": err.Error()})
		return
	}

	// Get client IP address for duplicate prevention
	ipAddress := utils.GetClientIP(c.Request)

	// Build review with proper types
	review := &models.Review{
		VendorID:   vendorObjectID,
		UserID:     primitive.NilObjectID, // Default to zero value
		IPAddress:  ipAddress,
		Rating:     req.Rating,
		Comment:    req.Content,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		IsApproved: false,
	}

	// Handle authenticated user
	if userIDStr, exists := c.Get("user_id_string"); exists {
		if userObjID, err := primitive.ObjectIDFromHex(userIDStr.(string)); err == nil {
			review.UserID = userObjID

			// Get username from context if available
			if userName, exists := c.Get("user_name"); exists {
				review.UserName = userName.(string)
			}
		}
	}

	if err := h.reviewService.CreateReview(c.Request.Context(), review); err != nil {
		log.Error().Err(err).Msg("Failed to create review")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create review"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Review submitted successfully",
		"note":    "Review pending moderation",
	})
}

// GetVendorReviews handles GET /api/vendors/:vendor_id/reviews
func (h *ReviewHandler) GetVendorReviews(c *gin.Context) {
	vendorIDParam := c.Param("vendor_id")
	if vendorIDParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Vendor ID is required"})
		return
	}

	// Check if user is admin
	isAdmin := false
	if adminVal, exists := c.Get("is_admin"); exists {
		isAdmin, _ = adminVal.(bool)
	}

	var reviews []models.Review
	var err error

	if isAdmin {
		// Admin can see all reviews (including unapproved)
		reviews, err = h.reviewService.GetReviewsByVendor(c.Request.Context(), vendorIDParam)
	} else {
		// Public only sees approved reviews
		reviews, err = h.reviewService.GetApprovedReviewsByVendor(c.Request.Context(), vendorIDParam)
	}

	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch reviews")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch reviews"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vendor_id": vendorIDParam,
		"count":     len(reviews),
		"reviews":   reviews,
	})
}

// UpdateReviewApprovalStatus handles PATCH /api/v1/admin/reviews/:id/status
func (h *ReviewHandler) UpdateReviewApprovalStatus(c *gin.Context) {
	reviewID := c.Param("id")
	if reviewID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Review ID is required"})
		return
	}

	var req struct {
		IsApproved bool   `json:"isApproved" binding:"required"`
		Response   string `json:"response,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body", "error": err.Error()})
		return
	}

	// Convert string ID to ObjectID
	reviewObjID, err := primitive.ObjectIDFromHex(reviewID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid review ID format"})
		return
	}

	err = h.reviewService.UpdateReviewApprovalStatus(c.Request.Context(), reviewObjID, req.IsApproved)
	if err != nil {
		log.Error().Err(err).Msg("Failed to update review approval status")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update review status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Review status updated successfully"})
}