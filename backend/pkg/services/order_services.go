//backend/pkg/services/order_services.go

package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/repository"
	"eventify/backend/pkg/utils"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

type OrderService interface {
	VerifyAndProcess(ctx context.Context, reference string) (*models.Order, error)
	ProcessWebhook(ctx context.Context, payload *models.PaystackWebhook) error
	InitializePendingOrder(ctx context.Context, req *models.OrderInitializationRequest) (*models.Order, error)

}

type PaystackClient struct {
	SecretKey  string
	HTTPClient *http.Client
}

type OrderServiceImpl struct {
	OrderRepo      repository.OrderRepository
	PaystackClient *PaystackClient
}

func NewOrderService(orderRepo repository.OrderRepository, psClient *PaystackClient) OrderService {
	return &OrderServiceImpl{
		OrderRepo:      orderRepo,
		PaystackClient: psClient,
	}
}

// ============================================================================
// PUBLIC METHODS
// ============================================================================

// InitializePendingOrder handles the creation of an order record in the DB
func (s *OrderServiceImpl) InitializePendingOrder(ctx context.Context, req *models.OrderInitializationRequest) (*models.Order, error) {
	// 1. **Security & Validation Checks**
	if req.AmountInKobo <= 0 {
		log.Warn().Int("amount", req.AmountInKobo).Msg("Attempted initialization with invalid amount")
		return nil, errors.New("invalid or zero payment amount")
	}

	// 2. **Generate Secure Reference** (Uses the new utility function)
	reference := utils.GenerateUniqueTransactionReference()

	// 3. **Create PENDING Order Model** (Transformation)
	// We map the request data to the secure database model
	pendingOrder := models.Order{
		Reference:  reference,
		Status:     "pending", // CRITICAL: Mark as PENDING
		AmountKobo: req.AmountInKobo, // CRITICAL: Store the expected amount securely
		
		// Map customer and item data for later finalization/ticket generation
		Customer:   req.CustomerInfo,
		Items:      req.Items,
		
		// The UserID should be set here if the user is authenticated, otherwise nil
		UserID:     nil, // Assuming guest checkout for now
	}

	log.Info().
		Str("reference", reference).
		Int("expected_kobo", pendingOrder.AmountKobo).
		Msg("Attempting to save pending order to DB")

	// 4. **Call Repository to Save** (Assumes OrderRepo.SavePendingOrder is implemented)
	// NOTE: We need to assume OrderRepo.SavePendingOrder is the correct method here.
	orderID, err := s.OrderRepo.SavePendingOrder(ctx, &pendingOrder)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Failed to save pending order")
		return nil, fmt.Errorf("failed to initialize payment: %w", err)
	}

	// Populate the returned object with the generated ID for the response
	pendingOrder.ID = orderID

	log.Info().
		Str("reference", reference).
		Str("order_id", orderID.Hex()).
		Msg("Pending order saved successfully")

	// The frontend needs the secure, server-generated reference and the amount
	return &pendingOrder, nil
}

func (s *OrderServiceImpl) VerifyAndProcess(ctx context.Context, reference string) (*models.Order, error) {
	log.Info().Str("reference", reference).Msg("Starting payment verification")

	// 1. LOAD EXPECTED ORDER FROM DB (Source of Truth)
	// We MUST ensure the pending order exists and has the expected amount.
	existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference)

	// --- CRITICAL FIX: Check if the PENDING order was found ---
	if err != nil || existingOrder == nil {
		log.Error().Err(err).Str("reference", reference).Msg("Verification failed: PENDING order record not found in DB.")
		// This handles the "Expected: 0" case by failing securely before calling Paystack.
		return nil, errors.New("order initialization record not found. Cannot verify payment securely.")
	}
    
    // The expected amount is now securely sourced from the database
    expectedAmountKobo := existingOrder.AmountKobo // 🎯 SECURE VALUE

	// 2. Check Idempotency (Already Successful)
	if existingOrder.Status == "success" {
		log.Info().
			Str("reference", reference).
			Str("order_id", existingOrder.ID.Hex()).
			Msg("Order already processed successfully (idempotency check)")
		return existingOrder, nil
	}
    
    // --- At this point, existingOrder is a PENDING record with the correct expected amount ---
    
	// 3. Call Paystack Verification API
	log.Info().Str("reference", reference).Msg("Calling Paystack verification API")
	paystackResp, err := s.callPaystackVerificationAPI(ctx, reference)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Paystack API call failed")
		return nil, fmt.Errorf("paystack verification failed: %w", err)
	}

    // Check Paystack transaction status
	if !paystackResp.Status || paystackResp.Data.Status != "success" {
		log.Warn().
			Str("reference", reference).
			Str("transaction_status", paystackResp.Data.Status).
			Msg("Transaction not successful on Paystack side.")
		
        // TODO: Update the existingOrder status to "failed" in the DB.
		return nil, errors.New("paystack transaction was not successful or failed")
	}

	// 4. SECURE FRAUD CHECK (DB Expected vs. Paystack Actual)
	actualAmountKobo := paystackResp.Data.Amount // ACTUAL VALUE FROM PAYSTACK
	
	log.Info().
		Str("reference", reference).
		Int("expected_kobo", expectedAmountKobo). // Log secure amount
		Int("actual_kobo", actualAmountKobo).     // Log actual amount
		Msg("Running secure amount validation")

	if expectedAmountKobo != actualAmountKobo {
		log.Error().
			Str("reference", reference).
			Int("expected", expectedAmountKobo).
			Int("actual", actualAmountKobo).
			Msg("🚨 FRAUD ALERT: Amount mismatch detected.")
        
        // TODO: Update the existingOrder status to "fraud" and notify internal teams.
		return nil, fmt.Errorf("fraud alert: amount mismatch. Expected: %d, Actual: %d", expectedAmountKobo, actualAmountKobo)
	}

	// 5. FINALIZE ORDER
	log.Info().Str("reference", reference).Msg("Amount matched, finalizing order and generating tickets")
	
    // We now call a new dedicated finalization function
    // The old logic (parsing metadata and calling createOrderAndTickets) is now obsolete/insecure.
	finalOrder, err := s.finalizeSuccessfulOrder(ctx, existingOrder, paystackResp.Data)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Order finalization failed")
		return nil, fmt.Errorf("failed to finalize order and tickets: %w", err)
	}

	log.Info().Str("reference", reference).Str("order_id", finalOrder.ID.Hex()).Msg("Order and tickets created successfully")
	return finalOrder, nil
}

func (s *OrderServiceImpl) ProcessWebhook(ctx context.Context, payload *models.PaystackWebhook) error {
	reference := payload.Data.Reference
	log.Info().
		Str("reference", reference).
		Str("event", payload.Event).
		Msg("Processing webhook")

    // 1. LOAD EXPECTED ORDER FROM DB (Source of Truth)
    // We MUST ensure the pending order exists and has the expected amount.
	existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference)

	// --- CRITICAL FIX: Check if the PENDING order was found ---
    // If the record isn't in the DB, we cannot proceed securely.
	if err != nil || existingOrder == nil {
		log.Error().Err(err).Str("reference", reference).Msg("Webhook processing failed: PENDING order record not found.")
		// We return nil (200 OK) here to Paystack to prevent retries, but we log the internal failure.
		// Note: The lack of a local record means the payment cannot be processed.
		return errors.New("order initialization record not found during webhook processing")
	}

    // 2. Check Idempotency (Already Successful)
	if existingOrder.Status == "success" {
		log.Info().
			Str("reference", reference).
			Str("order_id", existingOrder.ID.Hex()).
			Msg("Webhook: Order already processed (idempotency check)")
		return nil
	}

    // 3. Check Paystack Transaction Status
	if payload.Data.Status != "success" {
		log.Warn().
			Str("reference", reference).
			Str("status", payload.Data.Status).
			Msg("Webhook: Non-successful transaction status. Ignoring.")
        // TODO: Update existingOrder status to "failed" or "abandoned" in the DB.
		return nil // Return nil to acknowledge the webhook, but take no action.
	}

    // 4. SECURE FRAUD CHECK (DB Expected vs. Webhook Actual)
    expectedAmountKobo := existingOrder.AmountKobo // 🎯 SECURE VALUE FROM DB
    actualAmountKobo := payload.Data.Amount        // ACTUAL VALUE FROM WEBHOOK
    
    log.Info().
		Str("reference", reference).
		Int("expected_kobo", expectedAmountKobo). 
		Int("actual_kobo", actualAmountKobo).     
		Msg("Webhook: Running secure amount validation")

	if expectedAmountKobo != actualAmountKobo {
		log.Error().
			Str("reference", reference).
			Int("expected", expectedAmountKobo).
			Int("actual", actualAmountKobo).
			Msg("🚨 FRAUD ALERT: Amount mismatch detected via webhook.")
        
        // TODO: Update existingOrder status to "fraud" and notify internal teams.
		return errors.New("fraud alert: amount mismatch detected via webhook") // Return error to log internal failure
	}

    // 5. FINALIZE ORDER
	log.Info().Str("reference", reference).Msg("Webhook: Amount matched, finalizing order and generating tickets")
	
    // We replace the old metadata parsing and `createOrderAndTickets` with the finalizer
	finalOrder, err := s.finalizeSuccessfulOrder(ctx, existingOrder, payload.Data)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Webhook: Order finalization failed")
		return fmt.Errorf("webhook processing failed during order finalization: %w", err)
	}

	log.Info().
		Str("reference", reference).
		Str("order_id", finalOrder.ID.Hex()).
		Msg("Webhook: Order processed successfully")

	return nil
}

// ============================================================================
// CORE BUSINESS LOGIC
// ============================================================================

// finalizeSuccessfulOrder is called ONLY after secure amount verification.
// It updates the existing PENDING order status and generates/saves tickets.
func (s *OrderServiceImpl) finalizeSuccessfulOrder(
	ctx context.Context,
    // 🎯 IMPORTANT: We use the existing, secure order record from the DB
	existingOrder *models.Order, 
	paystackData *models.PaystackData,
) (*models.Order, error) {

    // 1. **REMOVE FRAUD CHECK:** The fraud check is now performed in VerifyAndProcess/ProcessWebhook.
    // The amount comparison logic is deleted here.

	now := time.Now()
    
    // 2. **UPDATE EXISTING ORDER:** Populate the existing object with final details
    // The Customer and Item details were already securely stored during initialization.
	
    existingOrder.Status = "success" // CRITICAL: Update status from "pending"
    existingOrder.AmountKobo = paystackData.Amount // Final verified amount (should match expected)
	existingOrder.FeeKobo = paystackData.Fees
	existingOrder.UpdatedAt = now
    
    // Note: If you still need the Subtotal, ServiceFee, etc. from metadata for any reason,
    // you would need to store them during the Initialize step instead of relying on parsing Paystack metadata here.
    // For this refactoring, we rely on the data saved in the PENDING order record.

	log.Info().
		Str("reference", existingOrder.Reference).
		Str("order_id", existingOrder.ID.Hex()).
		Msg("Order object finalized, generating tickets")

    // 3. **Generate Tickets:** Use the securely stored Items/Customer data
	var ticketsToInsert []models.Ticket
	ticketIndex := 0

    // We iterate over the items already securely stored in the existingOrder object
	for _, item := range existingOrder.Items { 
		log.Debug().
			Str("event_id", item.EventID).
			Str("tier", item.TierName).
			Int("quantity", item.Quantity).
			Msg("Generating tickets for item")

		for i := 0; i < item.Quantity; i++ {
			ticket := models.Ticket{
				ID:  primitive.NewObjectID(),
				Code: utils.GenerateUniqueTicketCode(existingOrder.Reference, ticketIndex),
				OrderID: existingOrder.ID,
				EventID: item.EventID,
				EventTitle: item.EventTitle,
				TierName: item.TierName,
				Price: item.Price,
				OwnerEmail: existingOrder.Customer.Email,
				OwnerName: existingOrder.Customer.FirstName + " " + existingOrder.Customer.LastName,
				IsUsed: false,
				CreatedAt: now,
				UpdatedAt: now,
			}
			ticketsToInsert = append(ticketsToInsert, ticket)
			ticketIndex++
		}
	}

	log.Info().
		Str("reference", existingOrder.Reference).
		Int("ticket_count", len(ticketsToInsert)).
		Msg("Tickets generated, starting atomic DB update")

    // 4. **CALL REPOSITORY (Needs New Method):**
    // We must replace the old CreateOrderAndTickets call.
    // We now need a function that performs an **UPDATE** on the OrderCollection
    // and an **INSERT MANY** on the TicketCollection atomically.
    
	// ⚠️ NOTE: This requires a NEW repository function, e.g.:
	// err := s.OrderRepo.UpdateOrderAndInsertTickets(ctx, existingOrder, ticketsToInsert)
    
    // For now, we will use the old function signature and assume we update the logic in order_repo.go
    // to handle the update/insert instead of just insert.
    // Let's assume you update `CreateOrderAndTickets` into a flexible `SaveFinalOrder` function.
    
    // Since we don't have the updated Repo, let's assume the new signature:
    err := s.OrderRepo.UpdateOrderAndInsertTickets(ctx, existingOrder, ticketsToInsert)
	if err != nil {
		log.Error().
			Err(err).
			Str("reference", existingOrder.Reference).
			Msg("Database persistence failed during finalization")
		return nil, fmt.Errorf("failed to save final order and tickets atomically: %w", err)
	}

	log.Info().
		Str("reference", existingOrder.Reference).
		Str("order_id", existingOrder.ID.Hex()).
		Int("tickets_created", len(ticketsToInsert)).
		Msg("Order finalized and tickets persisted successfully")

	return existingOrder, nil
}

// ============================================================================
// HELPER METHODS
// ============================================================================

func (s *OrderServiceImpl) callPaystackVerificationAPI(ctx context.Context, reference string) (*models.PaystackVerificationResponse, error) {
	url := fmt.Sprintf("https://api.paystack.co/transaction/verify/%s", reference)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.PaystackClient.SecretKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.PaystackClient.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errorBody, _ := io.ReadAll(resp.Body)
		log.Error().
			Int("status_code", resp.StatusCode).
			Str("response_body", string(errorBody)).
			Msg("Paystack API returned non-200 status")
		return nil, fmt.Errorf("paystack returned status %d: %s", resp.StatusCode, errorBody)
	}

	var psResponse models.PaystackVerificationResponse
	if err := utils.DecodeJSON(resp.Body, &psResponse); err != nil {
		return nil, fmt.Errorf("failed to decode paystack response: %w", err)
	}

	return &psResponse, nil
}

func (s *OrderServiceImpl) parseOrderMetadata(paystackMetadata models.PaystackMetadata) (*models.OrderMetadata, error) {
	log.Debug().Msg("Parsing order metadata from Paystack response")

	var orderMetadata models.OrderMetadata
	var orderDetailsJSON string

	// Check if custom_fields exists (new Paystack format)
	if len(paystackMetadata.CustomFields) > 0 {
		log.Debug().Int("custom_fields_count", len(paystackMetadata.CustomFields)).Msg("Found custom_fields in metadata")
		
		for _, field := range paystackMetadata.CustomFields {
			if field.VariableName == "order_details" {
				orderDetailsJSON = field.Value
				log.Debug().Str("order_details_length", fmt.Sprintf("%d", len(orderDetailsJSON))).Msg("Found order_details field")
				break
			}
		}
	}

	// Fallback to direct cart_items if custom_fields not found
	if orderDetailsJSON == "" && paystackMetadata.CartItems != "" {
		log.Debug().Msg("Using direct cart_items field")
		orderDetailsJSON = paystackMetadata.CartItems
	}

	if orderDetailsJSON == "" {
		log.Error().Msg("No order details found in metadata")
		return nil, errors.New("order details not found in metadata")
	}

	// Parse the complete order details JSON
	var orderDetails struct {
		Customer struct {
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
			Email     string `json:"email"`
			Phone     string `json:"phone"`
			City      string `json:"city"`
			State     string `json:"state"`
			Country   string `json:"country"`
		} `json:"customer"`
		Items []struct {
			EventID    string `json:"eventId"`
			TierID     string `json:"tierId"`
			Quantity   int    `json:"quantity"`
			Price      int    `json:"price"`
			EventTitle string `json:"eventTitle"`
			TierName   string `json:"tierName"`
		} `json:"items"`
		Totals struct {
			Subtotal     int `json:"subtotal"`
			ServiceFee   int `json:"serviceFee"`
			VATAmount    int `json:"vatAmount"`
			FinalTotal   int `json:"finalTotal"`
			AmountInKobo int `json:"amountInKobo"`
		} `json:"totals"`
	}

	if err := json.Unmarshal([]byte(orderDetailsJSON), &orderDetails); err != nil {
		log.Error().Err(err).Str("json", orderDetailsJSON).Msg("Failed to parse order details JSON")
		return nil, fmt.Errorf("failed to parse order details: %w", err)
	}

	// Map to our models
	orderMetadata.Customer = models.CustomerInfo{
		FirstName: orderDetails.Customer.FirstName,
		LastName:  orderDetails.Customer.LastName,
		Email:     orderDetails.Customer.Email,
		Phone:     orderDetails.Customer.Phone,
		City:      orderDetails.Customer.City,
		State:     orderDetails.Customer.State,
		Country:   orderDetails.Customer.Country,
	}

	for _, item := range orderDetails.Items {
		orderMetadata.Items = append(orderMetadata.Items, models.OrderItem{
			EventID:    item.EventID,
			EventTitle: item.EventTitle,
			TierName:   item.TierName,
			Quantity:   item.Quantity,
			Price:      item.Price,
			Subtotal:   item.Price * item.Quantity,
		})
	}

	orderMetadata.Totals = models.OrderTotals{
		Subtotal:     orderDetails.Totals.Subtotal,
		ServiceFee:   orderDetails.Totals.ServiceFee,
		VATAmount:    orderDetails.Totals.VATAmount,
		FinalTotal:   orderDetails.Totals.FinalTotal,
		AmountInKobo: orderDetails.Totals.AmountInKobo,
	}

	log.Info().
		Int("items_count", len(orderMetadata.Items)).
		Str("customer_email", orderMetadata.Customer.Email).
		Int("total_kobo", orderMetadata.Totals.AmountInKobo).
		Msg("Metadata parsed successfully")

	return &orderMetadata, nil
}