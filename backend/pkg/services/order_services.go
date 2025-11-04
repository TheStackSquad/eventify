// backend/pkg/services/order_service.go
package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
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
	InitializePendingOrder(ctx context.Context, req *models.OrderInitializationRequest) (*models.Order, error)
	VerifyAndProcess(ctx context.Context, reference string) (*models.Order, error)
	ProcessWebhook(ctx context.Context, payload *models.PaystackWebhook, signature string) error
	VerifyWebhookSignature(payload []byte, signature string) bool
	GetOrderByReference(ctx context.Context, reference string, userID string) (*models.Order, error)
}

type PaystackClient struct {
	SecretKey  string
	HTTPClient *http.Client
}

type OrderServiceImpl struct {
	OrderRepo      repository.OrderRepository
	PricingService PricingService // ✅ NEW: Added dependency for authoritative pricing
	PaystackClient *PaystackClient
}

// ============================================================================
// CONSTRUCTOR
// ============================================================================

// NewOrderService creates a new OrderService instance
func NewOrderService(
	orderRepo repository.OrderRepository,
	pricingService PricingService,
	psClient *PaystackClient,
) OrderService {
	return &OrderServiceImpl{
		OrderRepo:      orderRepo,
		PricingService: pricingService, // ✅ NEW: Injected pricing service
		PaystackClient: psClient,
	}
}

// ============================================================================
// INITIALIZATION (Step 1 - Refactored for Server Authority)
// ============================================================================

// InitializePendingOrder creates a new pending order with authoritative pricing
func (s *OrderServiceImpl) InitializePendingOrder(
	ctx context.Context,
	req *models.OrderInitializationRequest,
) (*models.Order, error) {
	// 1. VALIDATE MINIMAL REQUEST (only format, quantity, email)
	if err := req.Validate(); err != nil {
		log.Warn().
			Err(err).
			Msg("Order initialization basic format validation failed")
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	// 2. CALCULATE AUTHORITATIVE ORDER (Server Source of Truth)
	// This call performs the database lookups, stock checks, pricing, and fee calculations.
	pendingOrder, err := s.PricingService.CalculateAuthoritativeOrder(ctx, req)
	if err != nil {
		log.Error().Err(err).Msg("❌ Failed to calculate authoritative order price/fees")
		return nil, fmt.Errorf("pricing calculation failed: %w", err)
	}

	// 3. GENERATE SECURE REFERENCE & POPULATE ORDER
	reference := utils.GenerateUniqueTransactionReference()
	pendingOrder.Reference = reference
	pendingOrder.Status = "pending"
	pendingOrder.Customer = req.Customer // Use customer info from the client request
	pendingOrder.UserID = nil            // Set if authenticated

	log.Info().
		Str("reference", reference).
		Int("calculated_kobo", pendingOrder.AmountKobo).
		Int("subtotal", pendingOrder.Subtotal).
		Str("email", req.Email).
		Int("items_count", len(pendingOrder.Items)).
		Msg("✅ Authoritative order calculated and preparing for save")

	// 4. SAVE TO DATABASE
	orderID, err := s.OrderRepo.SavePendingOrder(ctx, pendingOrder)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Failed to save pending order")
		return nil, fmt.Errorf("failed to initialize payment: %w", err)
	}

	pendingOrder.ID = orderID

	log.Info().
		Str("reference", reference).
		Str("order_id", orderID.Hex()).
		Int("amount_kobo", pendingOrder.AmountKobo).
		Msg("✅ Pending order created successfully")

	return pendingOrder, nil
}

// ============================================================================
// VERIFICATION (Step 2 - Client Polling)
// ============================================================================

// VerifyAndProcess handles client-initiated verification (backup to webhook)
func (s *OrderServiceImpl) VerifyAndProcess(ctx context.Context, reference string) (*models.Order, error) {
	log.Info().Str("reference", reference).Msg("🔍 Starting payment verification")

	// 1. LOAD EXPECTED ORDER FROM DB (Source of Truth)
	existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Database error during verification")
		return nil, fmt.Errorf("database error: %w", err)
	}

	if existingOrder == nil {
		log.Error().Str("reference", reference).Msg("🚨 Verification failed: No pending order found")
		return nil, errors.New("order initialization record not found. Cannot verify payment securely")
	}

	// 2. CHECK IDEMPOTENCY (Already Processed)
	if existingOrder.Status == "success" {
		log.Info().
			Str("reference", reference).
			Str("order_id", existingOrder.ID.Hex()).
			Msg("✅ Order already processed successfully (idempotency check)")
		return existingOrder, nil
	}

	// 3. CHECK IF ALREADY FAILED
	if existingOrder.Status == "failed" || existingOrder.Status == "fraud" {
		log.Warn().
			Str("reference", reference).
			Str("status", existingOrder.Status).
			Msg("⚠️ Order already marked as failed/fraud")
		return nil, fmt.Errorf("payment %s", existingOrder.Status)
	}

	// 4. CALL PAYSTACK VERIFICATION API
	expectedAmountKobo := existingOrder.AmountKobo

	log.Info().
		Str("reference", reference).
		Int("expected_amount", expectedAmountKobo).
		Msg("📞 Calling Paystack verification API")

	paystackResp, err := s.callPaystackVerificationAPI(ctx, reference)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Paystack API call failed")
		return nil, fmt.Errorf("paystack verification failed: %w", err)
	}

	// 5. CHECK TRANSACTION STATUS
	if !paystackResp.Status || paystackResp.Data.Status != "success" {
		log.Warn().
			Str("reference", reference).
			Str("transaction_status", paystackResp.Data.Status).
			Msg("⚠️ Transaction not successful on Paystack")

		// Update order status to failed
		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "failed")

		return nil, fmt.Errorf("transaction failed: %s", paystackResp.Data.Status)
	}

	// 6. CRITICAL SECURITY CHECK: Amount Verification
	actualAmountKobo := paystackResp.Data.Amount

	log.Info().
		Str("reference", reference).
		Int("expected_kobo", expectedAmountKobo).
		Int("actual_kobo", actualAmountKobo).
		Msg("🔒 Performing amount validation")

	if expectedAmountKobo != actualAmountKobo {
		log.Error().
			Str("reference", reference).
			Int("expected", expectedAmountKobo).
			Int("actual", actualAmountKobo).
			Msg("🚨 FRAUD ALERT: Amount mismatch detected")

		// Mark as fraud
		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "fraud")

		return nil, fmt.Errorf("fraud alert: amount mismatch. Expected: %d, Actual: %d", expectedAmountKobo, actualAmountKobo)
	}

	// 7. FINALIZE ORDER
	log.Info().
		Str("reference", reference).
		Msg("✅ Amount matched. Finalizing order and generating tickets")

	finalOrder, err := s.finalizeSuccessfulOrder(ctx, existingOrder, paystackResp.Data, "verification")
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Order finalization failed")
		return nil, fmt.Errorf("failed to finalize order: %w", err)
	}

	log.Info().
		Str("reference", reference).
		Str("order_id", finalOrder.ID.Hex()).
		Msg("✅ Order verified and processed successfully via verification endpoint")

	return finalOrder, nil
}

// ============================================================================
// WEBHOOK PROCESSING (Step 2 - Primary Path)
// ============================================================================

// VerifyWebhookSignature validates Paystack webhook signature (CRITICAL SECURITY)
func (s *OrderServiceImpl) VerifyWebhookSignature(payload []byte, signature string) bool {
	if signature == "" {
		log.Warn().Msg("⚠️ Webhook received without signature")
		return false
	}

	// Create HMAC-SHA512 hash
	mac := hmac.New(sha512.New, []byte(s.PaystackClient.SecretKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	// Constant-time comparison to prevent timing attacks
	isValid := hmac.Equal([]byte(signature), []byte(expectedSignature))

	if !isValid {
		log.Error().
			Str("received_signature", signature[:min(20, len(signature))]+"...").
			Str("expected_signature", expectedSignature[:20]+"...").
			Msg("🚨 SECURITY ALERT: Invalid webhook signature")
	}

	return isValid
}

// ProcessWebhook handles Paystack webhook notifications (PRIMARY payment confirmation path)
func (s *OrderServiceImpl) ProcessWebhook(
	ctx context.Context,
	payload *models.PaystackWebhook,
	signature string,
) error {
	reference := payload.Data.Reference

	log.Info().
		Str("reference", reference).
		Str("event", payload.Event).
		Str("channel", payload.Data.Channel).
		Int("amount", payload.Data.Amount).
		Msg("📨 Processing webhook")

	// Track webhook attempts
	_ = s.OrderRepo.IncrementWebhookAttempts(ctx, reference)

	// 1. LOAD EXPECTED ORDER FROM DB
	existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Database error during webhook processing")
		return fmt.Errorf("database error: %w", err)
	}

	if existingOrder == nil {
		log.Error().
			Str("reference", reference).
			Msg("🚨 Webhook processing failed: No pending order found")
		return errors.New("order initialization record not found")
	}

	// 2. CHECK IDEMPOTENCY
	if existingOrder.Status == "success" {
		log.Info().
			Str("reference", reference).
			Str("order_id", existingOrder.ID.Hex()).
			Msg("✅ Webhook: Order already processed (idempotency)")
		return nil // Not an error - acknowledge webhook
	}

	// 3. CHECK TRANSACTION STATUS
	if payload.Data.Status != "success" {
		log.Warn().
			Str("reference", reference).
			Str("status", payload.Data.Status).
			Msg("⚠️ Webhook: Non-successful transaction status")

		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "failed")
		return nil // Acknowledge webhook but don't process
	}

	// 4. CRITICAL SECURITY CHECK: Amount Verification
	expectedAmountKobo := existingOrder.AmountKobo
	actualAmountKobo := payload.Data.Amount

	log.Info().
		Str("reference", reference).
		Int("expected_kobo", expectedAmountKobo).
		Int("actual_kobo", actualAmountKobo).
		Msg("🔒 Webhook: Performing amount validation")

	if expectedAmountKobo != actualAmountKobo {
		log.Error().
			Str("reference", reference).
			Int("expected", expectedAmountKobo).
			Int("actual", actualAmountKobo).
			Msg("🚨 FRAUD ALERT: Amount mismatch via webhook")

		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "fraud")

		return errors.New("fraud alert: amount mismatch via webhook")
	}

	// 5. FINALIZE ORDER
	log.Info().
		Str("reference", reference).
		Msg("✅ Webhook: Amount matched. Finalizing order")

	finalOrder, err := s.finalizeSuccessfulOrder(ctx, existingOrder, payload.Data, "webhook")
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Webhook: Order finalization failed")
		return fmt.Errorf("webhook processing failed: %w", err)
	}

	log.Info().
		Str("reference", reference).
		Str("order_id", finalOrder.ID.Hex()).
		Msg("✅ Webhook processed successfully")

	return nil
}

// GetOrderByReference retrieves an order by reference, enforcing ownership via userID.
// ✅ FIX: This function body satisfies the OrderService interface requirement.
func (s *OrderServiceImpl) GetOrderByReference(ctx context.Context, reference string, userID string) (*models.Order, error) {
	log.Debug().Str("reference", reference).Str("userID", userID).Msg("Attempting to retrieve order by reference and enforce ownership")

	order, err := s.OrderRepo.GetOrderByReference(ctx, reference) 
	if err != nil {
		log.Error().Err(err).Msg("Database retrieval error for order reference")
		return nil, fmt.Errorf("failed to retrieve order: %w", err)
	}
	if order == nil {
		// Order not found, return nil to the handler
		return nil, nil
	}

	// Authorization Check (Ownership Enforcement)
	// If the order's owner ID does not match the requesting user ID, deny access.
	// In a complete system, we would also check if the user is an admin here.
	if order.UserID.Hex() != userID {
		log.Warn().Str("orderUserID", order.UserID.Hex()).Str("requestingUserID", userID).Msg("Access denied: User does not own this order")
		// Returning nil causes the handler to send a 404/Access Denied
		return nil, nil
	}

	log.Info().Str("reference", reference).Msg("Order found and ownership confirmed")
	return order, nil
}

// ============================================================================
// CORE BUSINESS LOGIC
// ============================================================================

// finalizeSuccessfulOrder updates order to success and generates tickets (ATOMIC)
func (s *OrderServiceImpl) finalizeSuccessfulOrder(
	ctx context.Context,
	existingOrder *models.Order,
	paystackData *models.PaystackData,
	processedBy string,
) (*models.Order, error) {
	now := time.Now()
	paidAt := now

	// Parse PaidAt from Paystack if available
	if paystackData.PaidAt != "" {
		if t, err := time.Parse(time.RFC3339, paystackData.PaidAt); err == nil {
			paidAt = t
		}
	}

	// Update order with final details
	existingOrder.Status = "success"
	existingOrder.FeeKobo = paystackData.Fees
	existingOrder.PaymentChannel = paystackData.Channel
	existingOrder.PaidAt = &paidAt
	existingOrder.ProcessedBy = processedBy
	existingOrder.UpdatedAt = now

	log.Info().
		Str("reference", existingOrder.Reference).
		Str("order_id", existingOrder.ID.Hex()).
		Int("items_count", len(existingOrder.Items)).
		Msg("🎫 Starting ticket generation")

	// Generate tickets from stored items
	var ticketsToInsert []models.Ticket
	ticketIndex := 0

	for itemIdx, item := range existingOrder.Items {
		log.Info().
			Int("item_index", itemIdx).
			Str("event_id", item.EventID).
			Str("event_title", item.EventTitle).
			Str("tier", item.TierName).
			Int("quantity", item.Quantity).
			Int("unit_price", item.Price).
			Msg("Processing order item for ticket generation")

		for i := 0; i < item.Quantity; i++ {
			ticket := models.Ticket{
				ID:         primitive.NewObjectID(),
				Code:       utils.GenerateUniqueTicketCode(existingOrder.Reference, ticketIndex),
				OrderID:    existingOrder.ID,
				EventID:    item.EventID,
				EventTitle: item.EventTitle,
				TierName:   item.TierName,
				Price:      item.Price,
				OwnerEmail: existingOrder.Customer.Email,
				OwnerName:  existingOrder.Customer.FirstName + " " + existingOrder.Customer.LastName,
				IsUsed:     false,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			ticketsToInsert = append(ticketsToInsert, ticket)
			ticketIndex++

			log.Info().
				Str("ticket_code", ticket.Code).
				Int("ticket_number", ticketIndex).
				Str("owner_email", ticket.OwnerEmail).
				Msg("Ticket generated")
		}
	}

	log.Info().
		Str("reference", existingOrder.Reference).
		Str("order_id", existingOrder.ID.Hex()).
		Int("total_tickets", len(ticketsToInsert)).
		Msg("🎫 All tickets generated. Starting atomic DB update")

	// ATOMIC UPDATE: Order + Tickets (uses MongoDB transaction)
	err := s.OrderRepo.UpdateOrderAndInsertTickets(ctx, existingOrder, ticketsToInsert)
	if err != nil {
		log.Error().
			Err(err).
			Str("reference", existingOrder.Reference).
			Str("order_id", existingOrder.ID.Hex()).
			Int("attempted_tickets", len(ticketsToInsert)).
			Msg("❌ Database persistence failed during finalization")
		return nil, fmt.Errorf("failed to save final order and tickets atomically: %w", err)
	}

	log.Info().
		Str("reference", existingOrder.Reference).
		Str("order_id", existingOrder.ID.Hex()).
		Int("tickets_created", len(ticketsToInsert)).
		Str("processed_by", processedBy).
		Msg("✅ Order finalized and tickets persisted successfully")

	// TODO: Queue email notification here
	// s.emailQueue.SendOrderConfirmation(existingOrder, ticketsToInsert)

	return existingOrder, nil
}

// ============================================================================
// HELPER METHODS
// ============================================================================

// callPaystackVerificationAPI calls Paystack's transaction verification endpoint
func (s *OrderServiceImpl) callPaystackVerificationAPI(
	ctx context.Context,
	reference string,
) (*models.PaystackVerificationResponse, error) {
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

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}