//backend/pkg/models/user.go
package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
    Name      string             `bson:"name" json:"name" binding:"required"`
    Email     string             `bson:"email" json:"email" binding:"required,email"`
    Password  string             `bson:"password" json:"password" binding:"required,min=6"`
    CreatedAt time.Time          `bson:"created_at" json:"created_at"`
    UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
    Message string `json:"message"`
    User    *User  `json:"user,omitempty"`
    Token   string `json:"token,omitempty"`
}