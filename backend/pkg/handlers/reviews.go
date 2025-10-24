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
		Rating  int    `json:"rating" binding:"required"`
		Content string `json:"content"` // Keep as Content for frontend compatibility
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request body", "error": err.Error()})
		return
	}

	// Get client IP address for duplicate prevention
	ipAddress := utils.GetClientIP(c.Request)

	// Hybrid approach — store both userID (if authenticated) and IP
	var userObjectID *primitive.ObjectID
	if uid, exists := c.Get("user_id_string"); exists {
		if oid, err := primitive.ObjectIDFromHex(uid.(string)); err == nil {
			userObjectID = &oid
		}
	}

	review := &models.Review{
		VendorID:   vendorObjectID,
		UserID:     userObjectID,
		IPAddress:  ipAddress, // Add IP address for duplicate prevention
		Rating:     req.Rating,
		Comment:    req.Content, // Map Content from request to Comment in model
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		IsApproved: false, // Default to false for moderation
	}

	if err := h.reviewService.CreateReview(c.Request.Context(), review); err != nil {
		log.Error().Err(err).Msg("Failed to create review")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create review"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Review submitted successfully",
	})
}

// GetVendorReviews handles GET /api/vendors/:vendor_id/reviews
func (h *ReviewHandler) GetVendorReviews(c *gin.Context) {
	vendorIDParam := c.Param("vendor_id")
	if vendorIDParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Vendor ID is required"})
		return
	}

	reviews, err := h.reviewService.GetReviewsByVendor(c.Request.Context(), vendorIDParam)
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