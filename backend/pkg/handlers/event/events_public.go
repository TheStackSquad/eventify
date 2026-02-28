// backend/pkg/handlers/events_public.go

package event

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/eventify/backend/pkg/models"
	repoevent "github.com/eventify/backend/pkg/repository/event"
	"github.com/eventify/backend/pkg/utils"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// ============================================================================
// PUBLIC EVENT HANDLERS (Public Listing)
// ============================================================================

func (h *EventHandler) GetAllEvents(c *gin.Context) {
	// 1. Build filters from query params
	filters := repoevent.EventFilters{
		IsDeleted: false, // Always exclude deleted for public
	}
	
	// Event type filter
	if eventType := c.Query("eventType"); eventType != "" {
		et := models.EventType(eventType)
		filters.EventType = &et
	}
	
	// Category filter
	if category := c.Query("category"); category != "" {
		filters.Category = &category
	}
	
	// Location filter
	if city := c.Query("city"); city != "" {
		filters.City = &city
	}
	
	// Date range filters
	if startDate := c.Query("startDate"); startDate != "" {
		if t, err := time.Parse(time.RFC3339, startDate); err == nil {
			filters.StartDate = &t
		}
	}
	
	if endDate := c.Query("endDate"); endDate != "" {
		if t, err := time.Parse(time.RFC3339, endDate); err == nil {
			filters.EndDate = &t
		}
	}
	
	// Pagination
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 {
			filters.Limit = l
		}
	} else {
		filters.Limit = 50 // Default
	}
	
	if offset := c.Query("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil && o >= 0 {
			filters.Offset = o
		}
	}
	
	log.Debug().
		Interface("filters", filters).
		Msg("Fetching public events")
	
	// 2. Call service
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	
	events, err := h.eventService.GetAllEvents(ctx, filters)
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch public events")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch events"})
		return
	}
	
	// 3. Success response
	c.JSON(http.StatusOK, gin.H{
		"events": events,
		"total":  len(events),
		"filters": filters,
	})
}

func (h *EventHandler) GetPublicEventByID(c *gin.Context) {
	// 1. Parse event ID
	eventID, err := parseEventID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid event ID"})
		return
	}
	
	log.Debug().
		Str("event_id", eventID.String()).
		Msg("Fetching public event")
	
	// 2. Call service
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	
	event, err := h.eventService.GetEventByID(ctx, eventID, nil)
	if err != nil {
		log.Error().Err(err).Str("event_id", eventID.String()).Msg("Failed to fetch event")
		
		if appErr, ok := err.(*utils.AppError); ok {
			c.JSON(appErr.HTTPStatus(), gin.H{"message": appErr.Message})
			return
		}
		
		c.JSON(http.StatusNotFound, gin.H{"message": "Event not found"})
		return
	}
	
	// 3. Success response
	c.JSON(http.StatusOK, event)
}