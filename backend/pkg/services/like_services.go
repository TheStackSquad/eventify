// pkg/services/like_services.go

package services

import (
	"context"
    
	"eventify/backend/pkg/repository" // Adjust import path
	"eventify/backend/pkg/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// LikeToggleResponse is the DTO (Data Transfer Object) matching the frontend's expected response.
type LikeToggleResponse struct {
	EventID      string `json:"eventId"`      // Event ID as string
	NewLikeCount int    `json:"newLikeCount"` // Confirmed, accurate total count
	IsLiked      bool   `json:"isLiked"`      // Confirmed final status for the requesting user
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
	// 1. Convert string IDs to primitive.ObjectID
	eventID, err := primitive.ObjectIDFromHex(eventIDStr)
	if err != nil {
		return nil, utils.NewError(utils.ErrInvalidInput, "Invalid Event ID format")
	}
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, utils.NewError(utils.ErrInvalidInput, "Invalid User ID format")
	}

	// 2. Execute the toggle operation
	isLiked, err := s.likeRepo.ToggleLike(ctx, eventID, userID)
	if err != nil {
		// Handle specific DB errors here if necessary
		return nil, utils.NewError(utils.ErrInternal, "Failed to toggle like status in DB")
	}

	// 3. Get the new, definitive total count
	newCount, err := s.likeRepo.GetLikeCount(ctx, eventID)
	if err != nil {
		return nil, utils.NewError(utils.ErrInternal, "Failed to retrieve final like count")
	}

	// 4. Return the DTO
	return &LikeToggleResponse{
		EventID:      eventIDStr,
		NewLikeCount: newCount,
		IsLiked:      isLiked, // isLiked reflects the final state after the toggle operation
	}, nil
}