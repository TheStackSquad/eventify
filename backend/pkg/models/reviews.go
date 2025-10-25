// backend/pkg/models/review.go
package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Review struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	VendorID    primitive.ObjectID `bson:"vendor_id" json:"vendor_id"`
	UserID      primitive.ObjectID `bson:"user_id,omitempty" json:"user_id,omitempty"`
	UserName    string             `bson:"user_name,omitempty" json:"user_name,omitempty"`
	IPAddress   string             `bson:"ip_address,omitempty" json:"ip_address,omitempty"`
	Rating      int                `bson:"rating" json:"rating" binding:"required,min=1,max=5"`
	Comment     string             `bson:"comment" json:"comment"`
	IsApproved  bool               `bson:"is_approved" json:"is_approved"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}