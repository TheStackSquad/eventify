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
	"strings"
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
	EventRepo      repository.EventRepository // ✅ ADD: For ticket stock management
	PricingService PricingService
	PaystackClient *PaystackClient
}

// ============================================================================
// CONSTRUCTOR
// ============================================================================

// ✅ UPDATED: Added EventRepo dependency
func NewOrderService(
	orderRepo repository.OrderRepository,
	eventRepo repository.EventRepository, // ✅ NEW
	pricingService PricingService,
	psClient *PaystackClient,
) OrderService {
	return &OrderServiceImpl{
		OrderRepo:      orderRepo,
		EventRepo:      eventRepo, // ✅ NEW
		PricingService: pricingService,
		PaystackClient: psClient,
	}
}

// ============================================================================
// INITIALIZATION (Step 1)
// ============================================================================

func (s *OrderServiceImpl) InitializePendingOrder(
	ctx context.Context,
	req *models.OrderInitializationRequest,
) (*models.Order, error) {
	// 1. VALIDATE REQUEST
	if err := req.Validate(); err != nil {
		log.Warn().Err(err).Msg("Order initialization validation failed")
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	// 2. CALCULATE AUTHORITATIVE ORDER (checks stock availability)
	pendingOrder, err := s.PricingService.CalculateAuthoritativeOrder(ctx, req)
	if err != nil {
		log.Error().Err(err).Msg("❌ Failed to calculate authoritative order")
		return nil, fmt.Errorf("pricing calculation failed: %w", err)
	}

	// 3. GENERATE SECURE REFERENCE
	reference := utils.GenerateUniqueTransactionReference()
	pendingOrder.Reference = reference
	pendingOrder.Status = "pending"
	pendingOrder.Customer = req.Customer
	pendingOrder.UserID = nil

	log.Info().
		Str("reference", reference).
		Int("amount_kobo", pendingOrder.AmountKobo).
		Str("email", req.Email).
		Msg("✅ Order calculated, saving as pending")

	// 4. SAVE TO DATABASE
	orderID, err := s.OrderRepo.SavePendingOrder(ctx, pendingOrder)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Failed to save pending order")
		return nil, fmt.Errorf("failed to initialize payment: %w", err)
	}

	pendingOrder.ID = orderID
	log.Info().Str("reference", reference).Str("order_id", orderID.Hex()).Msg("✅ Pending order created")

	return pendingOrder, nil
}

// ============================================================================
// VERIFICATION (Step 2 - Client Polling)
// ============================================================================

func (s *OrderServiceImpl) VerifyAndProcess(ctx context.Context, reference string) (*models.Order, error) {
	log.Info().Str("reference", reference).Msg("🔍 Starting payment verification")

	// 1. LOAD ORDER
	existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Database error")
		return nil, fmt.Errorf("database error: %w", err)
	}

	if existingOrder == nil {
		log.Error().Str("reference", reference).Msg("🚨 No order found")
		return nil, errors.New("order initialization record not found. Cannot verify payment securely")
	}

	// 2. IDEMPOTENCY CHECK
	if existingOrder.Status == "success" {
		log.Info().Str("reference", reference).Msg("✅ Already processed (idempotent)")
		return existingOrder, nil
	}

	// 3. CHECK ALREADY FAILED
	if existingOrder.Status == "failed" || existingOrder.Status == "fraud" {
		log.Warn().Str("reference", reference).Str("status", existingOrder.Status).Msg("⚠️ Already failed")
		return nil, fmt.Errorf("payment %s", existingOrder.Status)
	}

	// ✅ NEW: Check if processing is already in progress
	if existingOrder.Status == "processing" {
		log.Info().Str("reference", reference).Msg("⏳ Already being processed by another request")
		return nil, errors.New("payment is being processed, please wait")
	}

	// 4. CALL PAYSTACK API
	paystackResp, err := s.callPaystackVerificationAPI(ctx, reference)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Paystack API failed")
		return nil, fmt.Errorf("paystack verification failed: %w", err)
	}

	// 5. CHECK STATUS
	if !paystackResp.Status || paystackResp.Data.Status != "success" {
		log.Warn().Str("reference", reference).Str("status", paystackResp.Data.Status).Msg("⚠️ Not successful")
		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "failed")
		return nil, fmt.Errorf("transaction failed: %s", paystackResp.Data.Status)
	}

	// 6. AMOUNT VERIFICATION
	if existingOrder.AmountKobo != paystackResp.Data.Amount {
		log.Error().
			Str("reference", reference).
			Int("expected", existingOrder.AmountKobo).
			Int("actual", paystackResp.Data.Amount).
			Msg("🚨 FRAUD: Amount mismatch")

		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "fraud")
		return nil, fmt.Errorf("fraud alert: amount mismatch")
	}

	// 7. ✅ FINALIZE WITH ATOMIC TRANSACTION
	log.Info().Str("reference", reference).Msg("✅ Verified, finalizing atomically")

	finalOrder, err := s.finalizeSuccessfulOrder(ctx, existingOrder, paystackResp.Data, "verification")
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Finalization failed")
		return nil, fmt.Errorf("failed to finalize order: %w", err)
	}

	log.Info().Str("reference", reference).Msg("✅ Order verified and processed successfully")
	return finalOrder, nil
}

// ============================================================================
// WEBHOOK PROCESSING (Step 2 - Primary Path)
// ============================================================================

func (s *OrderServiceImpl) VerifyWebhookSignature(payload []byte, signature string) bool {
	if signature == "" {
		log.Warn().Msg("⚠️ Webhook without signature")
		return false
	}

	mac := hmac.New(sha512.New, []byte(s.PaystackClient.SecretKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	isValid := hmac.Equal([]byte(signature), []byte(expectedSignature))

	if !isValid {
		log.Error().Msg("🚨 SECURITY: Invalid webhook signature")
	}

	return isValid
}

func (s *OrderServiceImpl) ProcessWebhook(
	ctx context.Context,
	payload *models.PaystackWebhook,
	signature string,
) error {
	reference := payload.Data.Reference

	log.Info().Str("reference", reference).Str("event", payload.Event).Msg("📨 Processing webhook")

	_ = s.OrderRepo.IncrementWebhookAttempts(ctx, reference)

	// 1. LOAD ORDER
	existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference)
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Database error")
		return fmt.Errorf("database error: %w", err)
	}

	if existingOrder == nil {
		log.Error().Str("reference", reference).Msg("🚨 No order found")
		return errors.New("order initialization record not found")
	}

	// 2. IDEMPOTENCY
	if existingOrder.Status == "success" {
		log.Info().Str("reference", reference).Msg("✅ Already processed (webhook idempotent)")
		return nil
	}

	// 3. CHECK STATUS
	if payload.Data.Status != "success" {
		log.Warn().Str("reference", reference).Str("status", payload.Data.Status).Msg("⚠️ Non-success webhook")
		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "failed")
		return nil
	}

	// ✅ NEW: Check if processing
	if existingOrder.Status == "processing" {
		log.Info().Str("reference", reference).Msg("⏳ Webhook: Already being processed")
		return nil // Acknowledge but don't process
	}

	// 4. AMOUNT VERIFICATION
	if existingOrder.AmountKobo != payload.Data.Amount {
		log.Error().
			Str("reference", reference).
			Int("expected", existingOrder.AmountKobo).
			Int("actual", payload.Data.Amount).
			Msg("🚨 FRAUD: Webhook amount mismatch")

		_ = s.OrderRepo.UpdateOrderStatus(ctx, existingOrder.ID, "fraud")
		return errors.New("fraud alert: amount mismatch via webhook")
	}

	// 5. ✅ FINALIZE ATOMICALLY
	log.Info().Str("reference", reference).Msg("✅ Webhook validated, finalizing atomically")

	_, err = s.finalizeSuccessfulOrder(ctx, existingOrder, payload.Data, "webhook")
	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("❌ Webhook finalization failed")
		return fmt.Errorf("webhook processing failed: %w", err)
	}

	log.Info().Str("reference", reference).Msg("✅ Webhook processed successfully")
	return nil
}

func (s *OrderServiceImpl) GetOrderByReference(ctx context.Context, reference string, userID string) (*models.Order, error) {
	order, err := s.OrderRepo.GetOrderByReference(ctx, reference)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve order: %w", err)
	}
	if order == nil {
		return nil, nil
	}

	if order.UserID.Hex() != userID {
		log.Warn().Str("orderUserID", order.UserID.Hex()).Str("requestingUserID", userID).Msg("Access denied")
		return nil, nil
	}

	return order, nil
}

// ============================================================================
// ✅ CRITICAL: ATOMIC FINALIZATION WITH TICKET STOCK REDUCTION
// ============================================================================

// finalizeSuccessfulOrder performs ALL operations atomically in a transaction
func (s *OrderServiceImpl) finalizeSuccessfulOrder(
	ctx context.Context,
	existingOrder *models.Order,
	paystackData *models.PaystackData,
	processedBy string,
) (*models.Order, error) {
	now := time.Now()
	paidAt := now

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

	// Generate tickets
	var ticketsToInsert []models.Ticket
	ticketIndex := 0

	for itemIdx, item := range existingOrder.Items {
		log.Info().
			Int("item_index", itemIdx).
			Str("event_id", item.EventID).
			Str("tier", item.TierName).
			Int("quantity", item.Quantity).
			Msg("Generating tickets for item")

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
				OwnerName:  strings.TrimSpace(existingOrder.Customer.FirstName + " " + existingOrder.Customer.LastName),
				IsUsed:     false,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			ticketsToInsert = append(ticketsToInsert, ticket)
			ticketIndex++
		}
	}

	log.Info().
		Str("reference", existingOrder.Reference).
		Int("total_tickets", len(ticketsToInsert)).
		Int("total_items", len(existingOrder.Items)).
		Msg("🎫 Tickets generated, starting ATOMIC transaction")

	// ✅ CRITICAL: Call new atomic method that includes stock reduction
	err := s.OrderRepo.FinalizeOrderAtomically(ctx, existingOrder, ticketsToInsert, s.EventRepo)
	if err != nil {
		log.Error().
			Err(err).
			Str("reference", existingOrder.Reference).
			Msg("❌ ATOMIC TRANSACTION FAILED - Nothing was saved")
		return nil, fmt.Errorf("atomic finalization failed: %w", err)
	}

	log.Info().
		Str("reference", existingOrder.Reference).
		Int("tickets_created", len(ticketsToInsert)).
		Str("processed_by", processedBy).
		Msg("✅ Order finalized ATOMICALLY with stock reduction")

	// ✅ NOTE: Email notifications should happen AFTER successful transaction
	// to avoid sending emails for failed transactions
	// TODO: Queue email notification here (non-blocking)
	// go s.sendOrderConfirmationEmail(existingOrder, ticketsToInsert)

	return existingOrder, nil
}

// ============================================================================
// HELPER METHODS
// ============================================================================

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
			Msg("Paystack API error")
		return nil, fmt.Errorf("paystack returned status %d: %s", resp.StatusCode, errorBody)
	}

	var psResponse models.PaystackVerificationResponse
	if err := utils.DecodeJSON(resp.Body, &psResponse); err != nil {
		return nil, fmt.Errorf("failed to decode paystack response: %w", err)
	}

	return &psResponse, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}