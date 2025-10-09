// backend/pkg/handlers/events.go
package handlers

import (
	"context"
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
	var event models.Event

	// 1. Bind and Validate the JSON Payload
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid event data", "error": utils.GetValidationErrors(err)})
		return
	}

	// 2. Inject Required Fields
	// Get the authenticated user's ID from the request context (set by AuthMiddleware)
	organizerID, exists := c.Get("userID")
	if !exists {
		// This should theoretically not happen if AuthMiddleware is used correctly
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Organizer ID not found in context"})
		return
	}
    
    // Convert the context value (interface{}) to primitive.ObjectID
    objID, ok := organizerID.(primitive.ObjectID)
    if !ok {
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid organizer ID format"})
        return
    }

	event.ID = primitive.NewObjectID()
	event.OrganizerID = objID
	event.CreatedAt = time.Now()
	event.UpdatedAt = time.Now()

	// 3. Insert into MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := h.EventCollection.InsertOne(ctx, event)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save event to database", "error": err.Error()})
		return
	}

	// 4. Success Response
	c.JSON(http.StatusCreated, gin.H{
		"message": "Event created successfully",
		"eventId": event.ID.Hex(),
	})
}