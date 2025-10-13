// backend/pkg/handlers/events.go
package handlers

import (
	"context"
	"net/http"
	"time"
	"fmt"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"
	"eventify/backend/pkg/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// EventHandler holds the EventService dependency.
type EventHandler struct {
	EventService *services.EventService // Now holds the service interface/struct
}

// NewEventHandler creates a new instance of EventHandler.
func NewEventHandler(eventService *services.EventService) *EventHandler {
	return &EventHandler{
		EventService: eventService,
	}
}

// CreateEvent handles the creation of a new event.
func (h *EventHandler) CreateEvent(c *gin.Context) {
	var event models.Event
	
	// 1. Bind and Validate the JSON Payload
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid event data",
			"error": utils.GetValidationErrors(err),
		})
		return
	}

	// 2. Inject Required Fields (HTTP Layer Responsibility)
	organizerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Organizer ID not found in context"})
		return
	}
	objID, ok := organizerID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid organizer ID format"})
		return
	}

	event.ID = primitive.NewObjectID()
	event.OrganizerID = objID
	event.IsDeleted = false
	event.CreatedAt = time.Now()
	event.UpdatedAt = time.Now()

	// 3. Call the Service Layer
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.EventService.Create(ctx, &event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to save event to database",
			"error": err.Error(),
		})
		return
	}

	// 4. Success Response
	c.JSON(http.StatusCreated, event)
}

// GetUserEventsHandler fetches all events owned by the authenticated user, excluding soft-deleted ones.
func (h *EventHandler) GetUserEventsHandler(c *gin.Context) {
	organizerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Organizer ID not found in context"})
		return
	}
	objID, ok := organizerID.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid organizer ID format"})
		return
	}
	fmt.Printf("🎯 DEBUG: Calling FindAllByOrganizer with organizerID: %s\n", objID.Hex())

	// 1. Call the Service Layer
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	events, err := h.EventService.FindAllByOrganizer(ctx, objID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch user events."})
		return
	}
	
	// 2. Success Response
	fmt.Printf("✅ DEBUG: Retrieved %d events from database\n", len(events))
	c.JSON(http.StatusOK, events)
}

func (h *EventHandler) GetEventByID(c *gin.Context) {
    organizerID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"message": "Organizer ID not found in context"})
        return
    }
    objID, ok := organizerID.(primitive.ObjectID)
    if !ok {
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Invalid organizer ID format"})
        return
    }

    eventIDParam := c.Param("eventId")
    eventID, err := primitive.ObjectIDFromHex(eventIDParam)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid event ID format"})
        return
    }

    fmt.Printf("🎯 DEBUG: Calling FindByID with eventID: %s, organizerID: %s\n", eventID.Hex(), objID.Hex())

    // 1. Call the Service Layer
    ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
    defer cancel()

    event, err := h.EventService.FindByID(ctx, eventID, objID)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"message": "Event not found or unauthorized to access"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch event"})
        return
    }
    
    // 2. Success Response
    fmt.Printf("✅ DEBUG: Retrieved event: %s\n", event.EventTitle)
    c.JSON(http.StatusOK, event)
}

// UpdateEvent handles the updating of an existing event.
func (h *EventHandler) UpdateEvent(c *gin.Context) {
	organizerID, _ := c.Get("user_id")
	eventIDParam := c.Param("eventId")

	// 1. Validate IDs
	eventID, err := primitive.ObjectIDFromHex(eventIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid event ID format"})
		return
	}
	organizerObjID := organizerID.(primitive.ObjectID)

	// 2. Bind Updates Payload
	var updates models.EventUpdate
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid update data",
			"error": utils.GetValidationErrors(err),
		})
		return
	}
	
	// 3. Call the Service Layer
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Call Update, which returns the modified model or an error
	updatedEvent, err := h.EventService.Update(ctx, eventID, organizerObjID, &updates)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"message": "Event not found or unauthorized to modify"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update event"})
		return
	}
	
	// 4. Success Response: Ensure the returned event object has the correct IDs set
	updatedEvent.ID = eventID
	updatedEvent.OrganizerID = organizerObjID
	updatedEvent.UpdatedAt = time.Now()
	c.JSON(http.StatusOK, updatedEvent)
}

// DeleteEvent handles the soft deletion of an event.
func (h *EventHandler) DeleteEvent(c *gin.Context) {
	organizerID, _ := c.Get("user_id")
	eventIDParam := c.Param("eventId")

	// 1. Validate IDs
	eventID, err := primitive.ObjectIDFromHex(eventIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid event ID format"})
		return
	}
	organizerObjID := organizerID.(primitive.ObjectID)

	// 2. Call the Service Layer (Soft Delete)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	deleted, err := h.EventService.SoftDelete(ctx, eventID, organizerObjID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete event"})
		return
	}

	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{"message": "Event not found or unauthorized to delete"})
		return
	}
	
	// 3. Success Response: Frontend expects the eventId back
	c.JSON(http.StatusOK, gin.H{"eventId": eventIDParam, "message": "Event successfully deleted"})
}

// FetchEventAnalytics computes and returns key metrics for a specific event.
func (h *EventHandler) FetchEventAnalytics(c *gin.Context) {
	organizerID, _ := c.Get("user_id")
	eventIDParam := c.Param("eventId")

	// 1. Validate IDs
	eventID, err := primitive.ObjectIDFromHex(eventIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid event ID format"})
		return
	}
	organizerObjID := organizerID.(primitive.ObjectID)
	
	// 2. Call the Service Layer
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	analytics, err := h.EventService.GetAnalytics(ctx, eventID, organizerObjID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"message": "Event not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch event details"})
		return
	}
	
	// 3. Success Response
	c.JSON(http.StatusOK, analytics)
}
