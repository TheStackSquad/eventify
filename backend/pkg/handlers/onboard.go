// backend/pkg/handlers/onboard.go

package handlers

import (
	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FeedbackHandler struct {
	service services.FeedbackService
}

func NewFeedbackHandler(service services.FeedbackService) *FeedbackHandler {
	return &FeedbackHandler{
		service: service,
	}
}

// CreateFeedback godoc
// @Summary Create feedback submission
// @Description Allows both authenticated and anonymous users to submit feedback
// @Tags Feedback
// @Accept json
// @Produce json
// @Param feedback body model.CreateFeedbackRequest true "Feedback data"
// @Success 201 {object} model.FeedbackResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/feedback [post]
func (h *FeedbackHandler) CreateFeedback(c *gin.Context) {
	var req models.CreateFeedbackRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error().Err(err).Msg("Invalid feedback request")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Check if user is authenticated (optional)
	var userID *primitive.ObjectID
	if userIDVal, exists := c.Get("userID"); exists {
		if id, ok := userIDVal.(primitive.ObjectID); ok {
			userID = &id
			log.Info().Str("user_id", id.Hex()).Msg("Authenticated user submitting feedback")
		}
	} else {
		log.Info().Msg("Anonymous user submitting feedback")
	}

	response, err := h.service.CreateFeedback(c.Request.Context(), req, userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create feedback")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit feedback"})
		return
	}

	log.Info().Str("feedback_id", response.ID).Msg("Feedback submitted successfully")
	c.JSON(http.StatusCreated, response)
}

// GetAllFeedback godoc
// @Summary Get all feedback submissions (Admin only)
// @Description Retrieves all feedback submissions for admin review
// @Tags Admin
// @Produce json
// @Success 200 {array} model.FeedbackResponse
// @Failure 500 {object} map[string]string
// @Router /api/v1/admin/feedback [get]
func (h *FeedbackHandler) GetAllFeedback(c *gin.Context) {
	log.Info().Msg("Admin fetching all feedback")

	feedbackList, err := h.service.GetAllFeedback(c.Request.Context())
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch feedback")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feedback"})
		return
	}

	log.Info().Int("count", len(feedbackList)).Msg("Successfully fetched feedback for admin")
	c.JSON(http.StatusOK, gin.H{
		"feedback": feedbackList,
		"count":    len(feedbackList),
	})
}

// DeleteFeedback godoc
// @Summary Delete feedback submission (Admin only)
// @Description Allows admin to delete a feedback submission
// @Tags Admin
// @Param id path string true "Feedback ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/admin/feedback/{id} [delete]
func (h *FeedbackHandler) DeleteFeedback(c *gin.Context) {
	feedbackID := c.Param("id")

	log.Info().Str("feedback_id", feedbackID).Msg("Admin deleting feedback")

	err := h.service.DeleteFeedback(c.Request.Context(), feedbackID)
	if err != nil {
		if err.Error() == "feedback not found" {
			log.Warn().Str("feedback_id", feedbackID).Msg("Feedback not found")
			c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
			return
		}
		log.Error().Err(err).Str("feedback_id", feedbackID).Msg("Failed to delete feedback")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete feedback"})
		return
	}

	log.Info().Str("feedback_id", feedbackID).Msg("Feedback deleted successfully")
	c.JSON(http.StatusOK, gin.H{"message": "Feedback deleted successfully"})
}