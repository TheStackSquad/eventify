// backend/pkg/handlers/events.go
package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// EventHandler holds the database connection for events.
type EventHandler struct {
	EventCollection *mongo.Collection
}

// NewEventHandler creates a new instance of EventHandler.
// NOTE: Your main.go should pass the MongoDB collection here.
func NewEventHandler(eventColl *mongo.Collection) *EventHandler {
	return &EventHandler{
		EventCollection: eventColl,
	}
}

// CreateEvent handles the creation of a new event.
// Path: POST /events/create (Protected)
func (h *EventHandler) CreateEvent(c *gin.Context) {
	fmt.Println("=== CREATE EVENT HANDLER CALLED ===")
	
	var event models.Event

	// 1. Bind and Validate the JSON Payload
	fmt.Println("Step 1: Binding JSON payload...")
	if err := c.ShouldBindJSON(&event); err != nil {
		fmt.Printf("❌ BINDING ERROR: %v\n", err)
		fmt.Printf("❌ VALIDATION ERRORS: %v\n", utils.GetValidationErrors(err))
		
		// Print raw request body for debugging
		body, _ := c.GetRawData()
		fmt.Printf("❌ RAW REQUEST BODY: %s\n", string(body))
		
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid event data", 
			"error": utils.GetValidationErrors(err),
		})
		return
	}
	fmt.Println("✅ JSON payload bound successfully")

	// 2. Inject Required Fields
	// Get the authenticated user's ID from the request context (set by AuthMiddleware)
	fmt.Println("Step 2: Getting organizer ID from context...")
	organizerID, exists := c.Get("user_id")
	if !exists {
		fmt.Println("❌ ORGANIZER ID NOT FOUND IN CONTEXT")
		// This should theoretically not happen if AuthMiddleware is used correctly
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Organizer ID not found in context"})
		return
	}
	fmt.Printf("✅ Organizer ID from context: %v (type: %T)\n", organizerID, organizerID)
    
    // Convert the context value (interface{}) to primitive.ObjectID
    fmt.Println("Step 3: Converting organizer ID to ObjectID...")
    objID, ok := organizerID.(primitive.ObjectID)
    if !ok {
        fmt.Printf("❌ INVALID ORGANIZER ID FORMAT: Expected primitive.ObjectID, got %T\n", organizerID)
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid organizer ID format"})
        return
    }
    fmt.Printf("✅ Converted organizer ID: %s\n", objID.Hex())

	// Print event data before setting IDs
	fmt.Println("Step 4: Event data before setting IDs:")
	fmt.Printf("  - EventTitle: %s\n", event.EventTitle)
	fmt.Printf("  - EventType: %s\n", event.EventType)
	fmt.Printf("  - StartDate: %v\n", event.StartDate)
	fmt.Printf("  - EndDate: %v\n", event.EndDate)
	fmt.Printf("  - TicketTiers count: %d\n", len(event.TicketTiers))
	if len(event.TicketTiers) > 0 {
		for i, tier := range event.TicketTiers {
			fmt.Printf("    Tier %d: %s - $%.2f - Qty: %d\n", i+1, tier.TierName, tier.Price, tier.Quantity)
		}
	}

	event.ID = primitive.NewObjectID()
	event.OrganizerID = objID
	event.CreatedAt = time.Now()
	event.UpdatedAt = time.Now()

	fmt.Printf("✅ Set event metadata:\n")
	fmt.Printf("  - Event ID: %s\n", event.ID.Hex())
	fmt.Printf("  - Organizer ID: %s\n", event.OrganizerID.Hex())
	fmt.Printf("  - CreatedAt: %v\n", event.CreatedAt)
	fmt.Printf("  - UpdatedAt: %v\n", event.UpdatedAt)

	// 3. Insert into MongoDB
	fmt.Println("Step 5: Inserting into MongoDB...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := h.EventCollection.InsertOne(ctx, event)
	if err != nil {
		fmt.Printf("❌ DATABASE INSERT ERROR: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to save event to database", 
			"error": err.Error(),
		})
		return
	}

	fmt.Printf("✅ Database insert successful. Inserted ID: %v\n", result.InsertedID)

	// 4. Success Response
	fmt.Println("=== EVENT CREATION SUCCESSFUL ===")
	c.JSON(http.StatusCreated, gin.H{
		"message": "Event created successfully",
		"eventId": event.ID.Hex(),
	})
}
// GetUserEventsHandler fetches all events owned by the authenticated user.
// Path: GET /events/my-events (Protected)
func (h *EventHandler) GetUserEventsHandler(c *gin.Context) {
    fmt.Println("=== GET USER EVENTS HANDLER CALLED ===")

    // 1. Get the authenticated user's ID from the request context (set by AuthMiddleware)
    organizerID, exists := c.Get("user_id")
    if !exists {
        fmt.Println("❌ ORGANIZER ID NOT FOUND IN CONTEXT")
        c.JSON(http.StatusUnauthorized, gin.H{"message": "Organizer ID not found in context"})
        return
    }

    // Convert the context value (interface{}) to primitive.ObjectID
    objID, ok := organizerID.(primitive.ObjectID)
    if !ok {
        fmt.Printf("❌ INVALID ORGANIZER ID FORMAT: Expected primitive.ObjectID, got %T\n", organizerID)
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid organizer ID format"})
        return
    }
    fmt.Printf("✅ Organizer ID for query: %s\n", objID.Hex())

    // 2. Call the Model function to query the database
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    events, err := models.FindEventsByOrganizer(ctx, h.EventCollection, objID)
    if err != nil {
        // Log the error for debugging but provide a generic error to the client
        fmt.Printf("❌ DATABASE QUERY ERROR: %v\n", err)
        c.JSON(http.StatusInternalServerError, gin.H{
            "message": "Failed to fetch user events.",
            "error": err.Error(),
        })
        return
    }

    // 3. Success Response
    fmt.Printf("✅ Fetched %d events for organizer: %s\n", len(events), objID.Hex())
    
    // Return a 200 OK status with the slice of events (even if the slice is empty)
    c.JSON(http.StatusOK, events)
}