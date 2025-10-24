//backend/pkg/models/inquiries.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Inquiry represents a message or booking request sent to a vendor.
type Inquiry struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	VendorID    primitive.ObjectID `bson:"vendor_id" json:"vendorId" binding:"required"`
	UserID    	*primitive.ObjectID `bson:"user_id,omitempty" json:"userId,omitempty"`
	IPAddress 	string              `bson:"ip_address,omitempty" json:"ipAddress,omitempty"`

	Name        string             `bson:"name" json:"name" binding:"required"`
	Email       string             `bson:"email" json:"email" binding:"required,email"`
	Phone       string             `bson:"phone" json:"phone"`
	Message     string             `bson:"message" json:"message" binding:"required"`
	EventDate   time.Time          `bson:"event_date,omitempty" json:"eventDate,omitempty"`
	Status      string             `bson:"status" json:"status"` // e.g. "pending", "responded", "closed"
	Response    string             `bson:"response,omitempty" json:"response,omitempty"`
	CreatedAt   time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updatedAt"`
}
