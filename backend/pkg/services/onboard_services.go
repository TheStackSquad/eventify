// backend/pkg/service/onboard_services.go

package services

import (
	"context"
	"eventify/backend/pkg/models"
	"eventify/backend/pkg/repository"
	"fmt"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type FeedbackService interface {
	CreateFeedback(ctx context.Context, req models.CreateFeedbackRequest, userID *primitive.ObjectID) (*models.FeedbackResponse, error)
	GetAllFeedback(ctx context.Context) ([]models.FeedbackResponse, error)
	DeleteFeedback(ctx context.Context, id string) error
}

type feedbackService struct {
	repo repository.FeedbackRepository
}

func NewFeedbackService(repo repository.FeedbackRepository) FeedbackService {
	return &feedbackService{
		repo: repo,
	}
}

func (s *feedbackService) CreateFeedback(ctx context.Context, req models.CreateFeedbackRequest, userID *primitive.ObjectID) (*models.FeedbackResponse, error) {
	log.Info().
		Str("name", req.Name).
		Str("email", req.Email).
		Str("type", string(req.Type)).
		Msg("Creating feedback submission")

	// Validate feedback type
	if req.Type != models.FeedbackTypeSuggestion &&
		req.Type != models.FeedbackTypeComplaint &&
		req.Type != models.FeedbackTypeFeedback {
		return nil, fmt.Errorf("invalid feedback type: %s", req.Type)
	}

	feedback := &models.Feedback{
		Name:     req.Name,
		Email:    req.Email,
		Type:     req.Type,
		Message:  req.Message,
		ImageURL: req.ImageURL,
		UserID:   userID, // Will be nil if not authenticated
	}

	err := s.repo.CreateFeedback(ctx, feedback)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create feedback in repository")
		return nil, fmt.Errorf("failed to create feedback: %w", err)
	}

	response := feedback.ToResponse()
	log.Info().Str("feedback_id", response.ID).Msg("Feedback created successfully")

	return &response, nil
}

func (s *feedbackService) GetAllFeedback(ctx context.Context) ([]models.FeedbackResponse, error) {
	log.Info().Msg("Fetching all feedback submissions")

	feedbackList, err := s.repo.GetAllFeedback(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch feedback from repository")
		return nil, fmt.Errorf("failed to fetch feedback: %w", err)
	}

	responses := make([]models.FeedbackResponse, 0, len(feedbackList))
	for _, feedback := range feedbackList {
		responses = append(responses, feedback.ToResponse())
	}

	log.Info().Int("count", len(responses)).Msg("Successfully fetched all feedback")
	return responses, nil
}

func (s *feedbackService) DeleteFeedback(ctx context.Context, id string) error {
	log.Info().Str("feedback_id", id).Msg("Deleting feedback")

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Error().Err(err).Str("feedback_id", id).Msg("Invalid feedback ID")
		return fmt.Errorf("invalid feedback ID: %w", err)
	}

	err = s.repo.DeleteFeedback(ctx, objectID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return fmt.Errorf("feedback not found")
		}
		log.Error().Err(err).Str("feedback_id", id).Msg("Failed to delete feedback")
		return fmt.Errorf("failed to delete feedback: %w", err)
	}

	log.Info().Str("feedback_id", id).Msg("Feedback deleted successfully")
	return nil
}