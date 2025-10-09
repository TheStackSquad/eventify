// backend/pkg/models/events.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TicketTier defines the structure for one type of ticket.
type TicketTier struct {
	Name     string  `bson:"name" json:"name" binding:"required"`
	Price    float64 `bson:"price" json:"price" binding:"required,gte=0"`
	Quantity int     `bson:"quantity" json:"quantity" binding:"required,gt=0"`
}

// Event represents an event document in MongoDB.
type Event struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	OrganizerID        primitive.ObjectID `bson:"organizer_id" json:"organizerId"` // Link to the User model
	EventTitle         string             `bson:"event_title" json:"eventTitle" binding:"required"`
	EventDescription   string             `bson:"event_description" json:"eventDescription" binding:"required"`
	Category           string             `bson:"category" json:"category" binding:"required"`
	EventType          string             `bson:"event_type" json:"eventType" binding:"required,oneof=physical virtual"` // physical or virtual
	EventImageURL      string             `bson:"event_image_url" json:"eventImage" binding:"required,url"`             // Stores the Vercel Blob URL
	
	// Location/Venue Details
	VenueName          string             `bson:"venue_name,omitempty" json:"venueName,omitempty"`
	VenueAddress       string             `bson:"venue_address,omitempty" json:"venueAddress,omitempty"`
	
	// Date and Time
	StartDate          time.Time          `bson:"start_date" json:"startDate" binding:"required"`
	EndDate            time.Time          `bson:"end_date" json:"endDate" binding:"required"`

	// Ticket/Pricing
	TicketTiers        []TicketTier       `bson:"ticket_tiers" json:"tickets" binding:"required,dive"`
	
	// Metadata
	CreatedAt          time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updated_at" json:"updatedAt"`
}