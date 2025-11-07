//backend/pkg/repository/event_repo.go

package repository

import (
	"context"
	"errors"
	"fmt"

	"eventify/backend/pkg/models"
	"github.com/rs/zerolog/log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ============================================================================
// TIER DETAILS MODEL (for pricing calculations)
// ============================================================================

// TierDetails contains all information needed for order pricing and validation
type TierDetails struct {
	EventID     string // Event identifier
	EventTitle  string // Event name (for display)
	TierName    string // Tier identifier (e.g., "VIP", "Regular")
	PriceKobo   int    // Price in kobo (converted from Naira)
	TotalStock  int    // Total tickets available for this tier
	SoldCount   int    // Number of tickets already sold
	Available   int    // Remaining tickets (TotalStock - SoldCount)
}

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

// EventRepository handles queries to the Event collection and related stock calculations
type EventRepository interface {
	// GetTierDetails fetches price and stock information for a specific event tier
	GetTierDetails(ctx context.Context, eventID string, tierName string) (*TierDetails, error)
	
	// GetEventByID retrieves a complete event document (for future use)
	GetEventByID(ctx context.Context, eventID string) (*models.Event, error)
	DecrementTicketStock(ctx context.Context, eventID string, tierName string, quantity int) error
}

// ============================================================================
// REPOSITORY IMPLEMENTATION
// ============================================================================

// MongoEventRepository implements EventRepository using MongoDB
type MongoEventRepository struct {
	EventCollection  *mongo.Collection
	TicketCollection *mongo.Collection
}

// NewMongoEventRepository creates a new EventRepository instance
func NewMongoEventRepository(eventColl, ticketColl *mongo.Collection) EventRepository {
	return &MongoEventRepository{
		EventCollection:  eventColl,
		TicketCollection: ticketColl,
	}
}

// ============================================================================
// TIER DETAILS QUERY (Core Pricing Logic)
// ============================================================================

// GetTierDetails fetches tier information and calculates real-time stock availability
// This is the AUTHORITATIVE source for pricing and stock validation
func (r *MongoEventRepository) GetTierDetails(
	ctx context.Context,
	eventID string,
	tierName string,
) (*TierDetails, error) {
	
	// STEP 1: Fetch the event document
	event, err := r.GetEventByID(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch event: %w", err)
	}

	// STEP 2: Find the requested tier in the event's ticket tiers
	var matchedTier *models.TicketTier
	for i := range event.TicketTiers {
		if event.TicketTiers[i].TierName == tierName {
			matchedTier = &event.TicketTiers[i]
			break
		}
	}

	if matchedTier == nil {
		return nil, fmt.Errorf("tier '%s' not found in event '%s'", tierName, eventID)
	}

	// STEP 3: Count sold tickets from the Ticket collection
	// Tickets are only created for successful orders, so every ticket = 1 sold
	soldCount, err := r.TicketCollection.CountDocuments(ctx, bson.M{
		"event_id":  eventID,
		"tier_name": tierName,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to count sold tickets: %w", err)
	}

	// STEP 4: Calculate availability
	totalStock := matchedTier.Quantity
	available := totalStock - int(soldCount)

	// Ensure available doesn't go negative (defensive programming)
	if available < 0 {
		available = 0
	}

	// STEP 5: Convert price from Naira (float64) to Kobo (int)
	// 1 Naira = 100 Kobo
	priceKobo := int(matchedTier.Price * 100)

	// STEP 6: Build and return TierDetails
	return &TierDetails{
		EventID:    eventID,
		EventTitle: event.EventTitle,
		TierName:   matchedTier.TierName,
		PriceKobo:  priceKobo,
		TotalStock: totalStock,
		SoldCount:  int(soldCount),
		Available:  available,
	}, nil
}

// ============================================================================
// EVENT QUERY (Supporting Function)
// ============================================================================

// GetEventByID retrieves a complete event document by its ID
// Only returns non-deleted events
func (r *MongoEventRepository) GetEventByID(
	ctx context.Context,
	eventID string,
) (*models.Event, error) {
	
	// Convert string ID to ObjectID
	objectID, err := primitive.ObjectIDFromHex(eventID)
	if err != nil {
		return nil, fmt.Errorf("invalid event ID format: %w", err)
	}

	// Query for non-deleted event
	filter := bson.M{
		"_id":        objectID,
		"is_deleted": false,
	}

	var event models.Event
	err = r.EventCollection.FindOne(ctx, filter).Decode(&event)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, fmt.Errorf("event not found or has been deleted")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &event, nil
}
func (r *MongoEventRepository) DecrementTicketStock(
	ctx context.Context,
	eventID string,
	tierName string,
	quantity int,
) error {
	if quantity <= 0 {
		return errors.New("quantity must be positive")
	}

	eventOID, err := primitive.ObjectIDFromHex(eventID)
	if err != nil {
		return fmt.Errorf("invalid event ID format: %w", err)
	}

	log.Info().
		Str("event_id", eventID).
		Str("tier", tierName).
		Int("quantity", quantity).
		Msg("🎟️ Attempting to decrement ticket stock")

	// ✅ ATOMIC UPDATE with CONDITIONAL CHECK
	// This ensures we only decrement if sufficient stock exists
	// The filter ensures we only match tiers with enough available tickets
	filter := bson.M{
		"_id": eventOID,
		"tiers": bson.M{
			"$elemMatch": bson.M{
				"name":      tierName,
				"available": bson.M{"$gte": quantity}, // Must have enough tickets
			},
		},
	}

	// Decrement the available count for the matching tier
	update := bson.M{
		"$inc": bson.M{
			"tiers.$[tier].available": -quantity, // Reduce available tickets
			"tiers.$[tier].sold":      quantity,  // Increase sold count
		},
	}

	// Array filters to target the specific tier by name
	arrayFilters := []interface{}{
		bson.M{"tier.name": tierName},
	}

	opts := options.Update().SetArrayFilters(options.ArrayFilters{
		Filters: arrayFilters,
	})

	result, err := r.EventCollection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Error().
			Err(err).
			Str("event_id", eventID).
			Str("tier", tierName).
			Msg("❌ Database error during stock decrement")
		return fmt.Errorf("failed to decrement stock: %w", err)
	}

	// Check if the update matched any documents
	if result.MatchedCount == 0 {
		log.Error().
			Str("event_id", eventID).
			Str("tier", tierName).
			Int("requested_quantity", quantity).
			Msg("🚨 CRITICAL: Insufficient ticket stock or tier not found")

		// This is a CRITICAL ERROR - means either:
		// 1. The tier doesn't exist
		// 2. Not enough tickets available (race condition or overselling attempt)
		return fmt.Errorf("insufficient stock for event %s tier %s (requested: %d)", eventID, tierName, quantity)
	}

	// Check if the update actually modified the document
	if result.ModifiedCount == 0 {
		log.Warn().
			Str("event_id", eventID).
			Str("tier", tierName).
			Msg("⚠️ Stock update matched but didn't modify - possible race condition")
		return fmt.Errorf("stock update failed for event %s tier %s", eventID, tierName)
	}

	log.Info().
		Str("event_id", eventID).
		Str("tier", tierName).
		Int("quantity", quantity).
		Msg("✅ Ticket stock decremented successfully")

	return nil
}

// ============================================================================
// OPTIONAL: STOCK VERIFICATION (for validation before creating pending order)
// ============================================================================

// CheckTicketAvailability verifies if sufficient tickets are available
// This is useful for early validation but the atomic decrement is the true check
func (r *MongoEventRepository) CheckTicketAvailability(
	ctx context.Context,
	eventID string,
	tierName string,
	quantity int,
) (bool, error) {
	eventOID, err := primitive.ObjectIDFromHex(eventID)
	if err != nil {
		return false, fmt.Errorf("invalid event ID: %w", err)
	}

	filter := bson.M{
		"_id": eventOID,
		"tiers": bson.M{
			"$elemMatch": bson.M{
				"name":      tierName,
				"available": bson.M{"$gte": quantity},
			},
		},
	}

	count, err := r.EventCollection.CountDocuments(ctx, filter)
	if err != nil {
		return false, fmt.Errorf("failed to check availability: %w", err)
	}

	return count > 0, nil
}