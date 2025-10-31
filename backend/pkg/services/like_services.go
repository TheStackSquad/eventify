// pkg/services/like_services.go

package services

import (
	"context"
    
	"eventify/backend/pkg/repository"
	"eventify/backend/pkg/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// LikeToggleResponse is the DTO (Data Transfer Object) matching the frontend's expected response.
type LikeToggleResponse struct {
	EventID      string `json:"eventId"`
	NewLikeCount int    `json:"newLikeCount"`
	IsLiked      bool   `json:"isLiked"`
}

// LikeService defines the methods for handling the like business logic.
type LikeService interface {
	ToggleLike(ctx context.Context, eventIDStr string, userIDStr string) (*LikeToggleResponse, error)
}

// likeService implements the LikeService interface.
type likeService struct {
	likeRepo repository.LikeRepository
}

// NewLikeService creates a new instance of LikeService.
func NewLikeService(lr repository.LikeRepository) LikeService {
	return &likeService{
		likeRepo: lr,
	}
}

// ToggleLike executes the atomic like/unlike operation and returns the final state.
func (s *likeService) ToggleLike(ctx context.Context, eventIDStr string, userIDStr string) (*LikeToggleResponse, error) {
	eventID, err := primitive.ObjectIDFromHex(eventIDStr)
	if err != nil {
		return nil, utils.NewError(
			utils.ErrCategoryValidation,
			"Invalid Event ID format",
			utils.ErrInvalidInput,
		)
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, utils.NewError(
			utils.ErrCategoryValidation,
			"Invalid User ID format",
			utils.ErrInvalidInput,
		)
	}

	isLiked, err := s.likeRepo.ToggleLike(ctx, eventID, userID)
	if err != nil {
		return nil, utils.NewError(
			utils.ErrCategoryDatabase,
			"Failed to toggle like status in DB",
			err,
		)
	}

	newCount, err := s.likeRepo.GetLikeCount(ctx, eventID)
	if err != nil {
		return nil, utils.NewError(
			utils.ErrCategoryDatabase,
			"Failed to retrieve final like count",
			err,
		)
	}

	return &LikeToggleResponse{
		EventID:      eventIDStr,
		NewLikeCount: newCount,
		IsLiked:      isLiked,
	}, nil
}