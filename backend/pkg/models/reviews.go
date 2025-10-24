//backend/pkg/models/reviews.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Review represents feedback left by a user for a vendor.
type Review struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	VendorID    primitive.ObjectID  `bson:"vendor_id" json:"vendorId" binding:"required"`
	UserID      *primitive.ObjectID `bson:"user_id,omitempty" json:"userId,omitempty"` // Pointer for nullable
	IPAddress   string              `bson:"ip_address" json:"ipAddress"` // Added for duplicate prevention
	Rating      int                 `bson:"rating" json:"rating" binding:"required,min=1,max=5"`
	Comment     string              `bson:"comment" json:"comment"`
	CreatedAt   time.Time           `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time           `bson:"updated_at" json:"updatedAt"`
	IsApproved  bool                `bson:"is_approved" json:"isApproved"` // for moderation workflow
}
