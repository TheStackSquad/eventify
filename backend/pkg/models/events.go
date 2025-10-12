// backend/pkg/models/events.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TicketTier defines the structure for one type of ticket.
type TicketTier struct {
	TierName    string  `bson:"tier_name" json:"tierName" binding:"required"`
	Price       float64 `bson:"price" json:"price" binding:"required,gte=0"`
	Quantity    int     `bson:"quantity" json:"quantity" binding:"required,gt=0"`
	Description string  `bson:"description,omitempty" json:"description,omitempty"`
}

// Event represents an event document in MongoDB.
type Event struct {
	ID                      primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	OrganizerID             primitive.ObjectID `bson:"organizer_id" json:"organizerId"`
	EventTitle              string             `bson:"event_title" json:"eventTitle" binding:"required"`
	EventDescription        string             `bson:"event_description" json:"eventDescription" binding:"required"`
	Category                string             `bson:"category" json:"category" binding:"required"`
	EventType               string             `bson:"event_type" json:"eventType" binding:"required,oneof=physical virtual"`
	EventImageURL           string             `bson:"event_image_url" json:"eventImage" binding:"required,url"`

	// Location/Venue Details (Physical Events)
	VenueName      string `bson:"venue_name,omitempty" json:"venueName,omitempty"`
	VenueAddress   string `bson:"venue_address,omitempty" json:"venueAddress,omitempty"`
	City           string `bson:"city,omitempty" json:"city,omitempty"`
	State          string `bson:"state,omitempty" json:"state,omitempty"`
	Country        string `bson:"country,omitempty" json:"country,omitempty"`

	// Virtual Event Details
	VirtualPlatform string `bson:"virtual_platform,omitempty" json:"virtualPlatform,omitempty"`
	MeetingLink     string `bson:"meeting_link,omitempty" json:"meetingLink,omitempty"`

	// Date and Time
	StartDate time.Time `bson:"start_date" json:"startDate" binding:"required"`
	EndDate   time.Time `bson:"end_date" json:"endDate" binding:"required"`

	// Ticket/Pricing
	TicketTiers              []TicketTier `bson:"ticket_tiers" json:"tickets" binding:"required,dive"`
	PaystackSubaccountCode string       `bson:"paystack_subaccount_code,omitempty" json:"paystackSubaccountCode,omitempty"`

	// Additional Options
	Tags           []string `bson:"tags,omitempty" json:"tags,omitempty"`
	MaxAttendees   *int     `bson:"max_attendees,omitempty" json:"maxAttendees,omitempty"`

	// --- Soft Delete Fields ---
	IsDeleted bool       `bson:"is_deleted" json:"isDeleted"`                       // Flag for soft deletion
	DeletedAt *time.Time `bson:"deleted_at,omitempty" json:"deletedAt,omitempty"` // Timestamp of deletion

	// Metadata
	CreatedAt time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bson:"updated_at" json:"updatedAt"`
}


// EventUpdate represents partial updates for an event
type EventUpdate struct {
	EventTitle       *string       `bson:"event_title,omitempty" json:"eventTitle,omitempty"`
	EventDescription *string       `bson:"event_description,omitempty" json:"eventDescription,omitempty"`
	Category         *string       `bson:"category,omitempty" json:"category,omitempty"`
	EventType        *string       `bson:"event_type,omitempty" json:"eventType,omitempty"`
	EventImageURL    *string       `bson:"event_image_url,omitempty" json:"eventImage,omitempty"`
	
	// Location fields
	VenueName        *string       `bson:"venue_name,omitempty" json:"venueName,omitempty"`
	VenueAddress     *string       `bson:"venue_address,omitempty" json:"venueAddress,omitempty"`
	City             *string       `bson:"city,omitempty" json:"city,omitempty"`
	State            *string       `bson:"state,omitempty" json:"state,omitempty"`
	Country          *string       `bson:"country,omitempty" json:"country,omitempty"`
	
	// Virtual event fields
	VirtualPlatform  *string       `bson:"virtual_platform,omitempty" json:"virtualPlatform,omitempty"`
	MeetingLink      *string       `bson:"meeting_link,omitempty" json:"meetingLink,omitempty"`
	
	// Date fields
	StartDate        *time.Time    `bson:"start_date,omitempty" json:"startDate,omitempty"`
	EndDate          *time.Time    `bson:"end_date,omitempty" json:"endDate,omitempty"`
	
	// Ticket tiers
	TicketTiers      *[]TicketTier `bson:"ticket_tiers,omitempty" json:"tickets,omitempty"`
	
	// Additional options
	Tags             *[]string     `bson:"tags,omitempty" json:"tags,omitempty"`
	MaxAttendees     *int          `bson:"max_attendees,omitempty" json:"maxAttendees,omitempty"`
}

