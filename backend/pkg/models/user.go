//backend/pkg/models/user.go

package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents the full internal user account data, including credentials and administrative flags.
type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name      string             `bson:"name" json:"name" binding:"required"`
	Email     string             `bson:"email" json:"email" binding:"required,email"`
	Password string 			 `json:"password" bson:"password" binding:"required,min=6"`

	ResetToken       string    `bson:"reset_token,omitempty" json:"-"`
	ResetTokenExpiry time.Time `bson:"reset_token_expiry,omitempty" json:"-"`
	
	IsAdmin   bool               `bson:"is_admin" json:"is_admin"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// UserProfile is a cleaner structure for non-sensitive public or current-user responses (a DTO).
type UserProfile struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name    string             `bson:"name" json:"name"`
	Email   string             `bson:"email" json:"email"`
	IsAdmin bool               `bson:"is_admin" json:"is_admin"` // Useful for frontend routing
}

// ToUserProfile converts the secure User struct to the public UserProfile DTO.
func (u *User) ToUserProfile() *UserProfile {
	if u == nil {
		return nil
	}
	return &UserProfile{
		ID:      u.ID,
		Name:    u.Name,
		Email:   u.Email,
		IsAdmin: u.IsAdmin,
	}
}

// LoginRequest defines the structure for incoming login credentials.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse defines the structure for authentication API responses.
type AuthResponse struct {
	Message string       `json:"message"`
	User    *UserProfile `json:"user,omitempty"` // Use the profile struct here
	Token   string       `json:"token,omitempty"`
}

// 🆕 PASSWORD RESET REQUEST MODELS
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

type PasswordResetResponse struct {
	Message string `json:"message"`
	Valid   bool   `json:"valid,omitempty"` // For token verification
}