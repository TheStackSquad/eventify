package services

import (
	"context"
	"fmt"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/repository"

	"github.com/rs/zerolog/log"
)

// ============================================================================
// PRICING SERVICE INTERFACE
// ============================================================================

// PricingService is the authoritative source for calculating order prices and fees.
// It fetches real prices from the database and validates stock availability.
type PricingService interface {
	// CalculateAuthoritativeOrder takes a client request and returns a fully populated Order
	// with server-calculated prices, or an error if validation fails (e.g., out of stock)
	CalculateAuthoritativeOrder(ctx context.Context, req *models.OrderInitializationRequest) (*models.Order, error)
}

// ============================================================================
// PRICING SERVICE IMPLEMENTATION
// ============================================================================

// PricingServiceImpl implements PricingService using EventRepository for price lookups
type PricingServiceImpl struct {
	EventRepo repository.EventRepository
}

// NewPricingService creates a new PricingService instance
func NewPricingService(eventRepo repository.EventRepository) PricingService {
	return &PricingServiceImpl{
		EventRepo: eventRepo,
	}
}

// ============================================================================
// CORE PRICING CALCULATION
// ============================================================================

// CalculateAuthoritativeOrder is the SERVER SOURCE OF TRUTH for order pricing
// It performs the following:
// 1. Fetches REAL prices from database (ignores any client-provided prices)
// 2. Validates stock availability for each item
// 3. Calculates subtotal, service fees, VAT
// 4. Returns a complete Order ready to be saved as PENDING
func (s *PricingServiceImpl) CalculateAuthoritativeOrder(
	ctx context.Context,
	req *models.OrderInitializationRequest,
) (*models.Order, error) {

	log.Info().
		Str("email", req.Email).
		Int("item_count", len(req.Items)).
		Msg("🔍 Starting authoritative pricing calculation")

	var orderItems []models.OrderItem
	subtotalKobo := 0

	// STEP 1: Process each item in the order request
	for idx, clientItem := range req.Items {
		
		log.Debug().
			Int("item_index", idx).
			Str("event_id", clientItem.EventID).
			Str("tier_name", clientItem.TierName).
			Int("quantity", clientItem.Quantity).
			Msg("Processing order item")

		// STEP 1A: Fetch REAL price and stock from database
		tierDetails, err := s.EventRepo.GetTierDetails(ctx, clientItem.EventID, clientItem.TierName)
		if err != nil {
			log.Error().
				Err(err).
				Str("event_id", clientItem.EventID).
				Str("tier_name", clientItem.TierName).
				Msg("❌ Failed to fetch tier details")
			return nil, fmt.Errorf("failed to fetch pricing for event %s tier %s: %w", 
				clientItem.EventID, clientItem.TierName, err)
		}

		// STEP 1B: Validate stock availability
		if clientItem.Quantity > tierDetails.Available {
			log.Warn().
				Str("event_id", clientItem.EventID).
				Str("tier_name", clientItem.TierName).
				Int("requested", clientItem.Quantity).
				Int("available", tierDetails.Available).
				Msg("⚠️ Insufficient stock")
			
			return nil, fmt.Errorf(
				"insufficient stock for %s - %s: requested %d, only %d available",
				tierDetails.EventTitle,
				tierDetails.TierName,
				clientItem.Quantity,
				tierDetails.Available,
			)
		}

		// STEP 1C: Calculate item subtotal using SERVER price
		itemSubtotal := tierDetails.PriceKobo * clientItem.Quantity

		log.Info().
			Str("event_title", tierDetails.EventTitle).
			Str("tier_name", tierDetails.TierName).
			Int("unit_price_kobo", tierDetails.PriceKobo).
			Int("quantity", clientItem.Quantity).
			Int("item_subtotal_kobo", itemSubtotal).
			Int("stock_available", tierDetails.Available).
			Msg("✅ Item priced and validated")

		// STEP 1D: Build OrderItem with authoritative data
		orderItem := models.OrderItem{
			EventID:    clientItem.EventID,
			EventTitle: tierDetails.EventTitle, // From database, not client
			TierName:   tierDetails.TierName,
			Quantity:   clientItem.Quantity,
			Price:      tierDetails.PriceKobo, // 🔒 SERVER AUTHORITY - from DB
			Subtotal:   itemSubtotal,
		}

		orderItems = append(orderItems, orderItem)
		subtotalKobo += itemSubtotal
	}

	// STEP 2: Calculate fees using centralized logic
	serviceFeeKobo := models.CalculateServiceFee(subtotalKobo)
	vatKobo := models.CalculateVAT(serviceFeeKobo)
	finalTotalKobo := subtotalKobo + serviceFeeKobo + vatKobo

	log.Info().
		Int("subtotal_kobo", subtotalKobo).
		Int("service_fee_kobo", serviceFeeKobo).
		Int("vat_kobo", vatKobo).
		Int("final_total_kobo", finalTotalKobo).
		Msg("💰 Order totals calculated")

	// STEP 3: Build the complete Order structure
	order := &models.Order{
		// Financial totals (all in Kobo)
		Subtotal:   subtotalKobo,
		ServiceFee: serviceFeeKobo,
		VATAmount:  vatKobo,
		FinalTotal: finalTotalKobo,
		AmountKobo: finalTotalKobo, // This is what Paystack will charge

		// Order items with server-calculated prices
		Items: orderItems,

		// Customer information (from client request)
		Customer: req.Customer,

		// Status will be set to "pending" by the caller
		// Reference will be generated by the caller
		// Timestamps will be set by repository
	}

	log.Info().
		Int("total_items", len(orderItems)).
		Int("amount_kobo", order.AmountKobo).
		Msg("✅ Authoritative order calculation complete")

	return order, nil
}

// ============================================================================
// HELPER FUNCTIONS (Future Enhancement)
// ============================================================================

// Note: Additional helper functions can be added here for:
// - Bulk price lookups (optimization)
// - Price caching (if needed)
// - Discount code validation
// - Dynamic pricing rules
// - etc.