//backend/pkg/models/ticket.go

package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Ticket represents a single ticket document generated upon successful payment.
// It will be stored in a separate collection.
type Ticket struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	
	// Link to the Parent Order and Event
	OrderID     primitive.ObjectID `json:"orderId" bson:"order_id"`
	EventID     string             `json:"eventId" bson:"event_id"` // From OrderItem
	EventTitle  string             `json:"eventTitle" bson:"event_title"`
	
	// Ticket Details
	Code        string             `json:"code" bson:"code"`        // Unique code (e.g., QR code data)
	TierName    string             `json:"tierName" bson:"tier_name"` // e.g., "VIP", "Standard"
	Price       int                `json:"price" bson:"price"`
	
	// Customer Details (Denormalized for quick access)
	OwnerEmail  string             `json:"ownerEmail" bson:"owner_email"`
	OwnerName   string             `json:"ownerName" bson:"owner_name"`
	
	// Status and Timestamps
	IsUsed      bool               `json:"isUsed" bson:"is_used"` // True when checked in
	UsedAt      *time.Time         `json:"usedAt" bson:"used_at,omitempty"`
	CreatedAt   time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updated_at"`
}