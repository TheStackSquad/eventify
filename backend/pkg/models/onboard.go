// backend/pkg/models/onboard.go

package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FeedbackType string

const (
	FeedbackTypeSuggestion FeedbackType = "suggestion"
	FeedbackTypeComplaint  FeedbackType = "complaint"
	FeedbackTypeFeedback   FeedbackType = "feedback"
)

type Feedback struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name" binding:"required"`
	Email     string             `json:"email" bson:"email" binding:"required,email"`
	Type      FeedbackType       `json:"type" bson:"type" binding:"required"`
	Message   string             `json:"message" bson:"message" binding:"required"`
	ImageURL  string             `json:"image_url,omitempty" bson:"image_url,omitempty"`
	UserID    *primitive.ObjectID `json:"user_id,omitempty" bson:"user_id,omitempty"` // Optional - if authenticated
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

type CreateFeedbackRequest struct {
	Name     string       `json:"name" binding:"required"`
	Email    string       `json:"email" binding:"required,email"`
	Type     FeedbackType `json:"type" binding:"required"`
	Message  string       `json:"message" binding:"required"`
	ImageURL string       `json:"image_url,omitempty"`
}

type FeedbackResponse struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	Email     string       `json:"email"`
	Type      FeedbackType `json:"type"`
	Message   string       `json:"message"`
	ImageURL  string       `json:"image_url,omitempty"`
	UserID    string       `json:"user_id,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// ToResponse converts Feedback model to FeedbackResponse
func (f *Feedback) ToResponse() FeedbackResponse {
	resp := FeedbackResponse{
		ID:        f.ID.Hex(),
		Name:      f.Name,
		Email:     f.Email,
		Type:      f.Type,
		Message:   f.Message,
		ImageURL:  f.ImageURL,
		CreatedAt: f.CreatedAt,
		UpdatedAt: f.UpdatedAt,
	}

	if f.UserID != nil {
		resp.UserID = f.UserID.Hex()
	}

	return resp
}