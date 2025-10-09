// backend/pkg/models/events.go
package models

import (
	"context"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
)

// TicketTier defines the structure for one type of ticket.
type TicketTier struct {
	TierName    string  `bson:"tier_name" json:"tierName" binding:"required"`           // Changed from "name"
	Price       float64 `bson:"price" json:"price" binding:"required,gte=0"`
	Quantity    int     `bson:"quantity" json:"quantity" binding:"required,gt=0"`
	Description string  `bson:"description,omitempty" json:"description,omitempty"`    // Added
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
	VenueName               string             `bson:"venue_name,omitempty" json:"venueName,omitempty"`
	VenueAddress            string             `bson:"venue_address,omitempty" json:"venueAddress,omitempty"`
	City                    string             `bson:"city,omitempty" json:"city,omitempty"`                    // Added
	State                   string             `bson:"state,omitempty" json:"state,omitempty"`                  // Added
	Country                 string             `bson:"country,omitempty" json:"country,omitempty"`              // Added
	
	// Virtual Event Details
	VirtualPlatform         string             `bson:"virtual_platform,omitempty" json:"virtualPlatform,omitempty"`  // Added
	MeetingLink             string             `bson:"meeting_link,omitempty" json:"meetingLink,omitempty"`          // Added
	
	// Date and Time
	StartDate               time.Time          `bson:"start_date" json:"startDate" binding:"required"`
	EndDate                 time.Time          `bson:"end_date" json:"endDate" binding:"required"`

	// Ticket/Pricing
	TicketTiers             []TicketTier       `bson:"ticket_tiers" json:"tickets" binding:"required,dive"`
	PaystackSubaccountCode  string             `bson:"paystack_subaccount_code,omitempty" json:"paystackSubaccountCode,omitempty"` // Added
	
	// Additional Options
	Tags                    []string           `bson:"tags,omitempty" json:"tags,omitempty"`                    // Added
	MaxAttendees            *int               `bson:"max_attendees,omitempty" json:"maxAttendees,omitempty"`  // Added (changed to int)
	
	// Metadata
	CreatedAt               time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt               time.Time          `bson:"updated_at" json:"updatedAt"`

}

// FindEventsByOrganizer fetches all events created by a specific organizer.
func FindEventsByOrganizer(ctx context.Context, collection *mongo.Collection, organizerID primitive.ObjectID) ([]Event, error) {
    // 1. Define the query filter: Match documents where "organizer_id" equals the provided ID.
    filter := bson.M{"organizer_id": organizerID}

    // 2. Perform the find operation.
    // NOTE: You might add options here later (e.g., sorting, limiting fields).
    cursor, err := collection.Find(ctx, filter)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    // 3. Decode the results into a slice of Event structs.
    var events []Event
    if err = cursor.All(ctx, &events); err != nil {
        return nil, err
    }

    // 4. Check for any cursor errors that occurred during iteration.
    if err := cursor.Err(); err != nil {
        return nil, err
    }

    return events, nil
}