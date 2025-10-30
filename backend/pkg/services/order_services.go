//backend/pkg/services/order_services.go
package services

import (
	"context"
	"errors"
	"fmt"
	"time"
	"net/http"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/repository"
	"io"
	"eventify/backend/pkg/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrderService defines the contract for order processing and payment verification.
type OrderService interface {
	VerifyAndProcess(ctx context.Context, reference string) (*models.Order, error)
	ProcessWebhook(ctx context.Context, payload *models.PaystackWebhook) error
	// The core logic that saves the order and creates tickets, reusable by both methods.
	createOrderAndTickets(ctx context.Context, paystackResponseData *models.PaystackData, metadata *models.OrderMetadata) (*models.Order, error)
}

// -------------------------------------------------------------------
// 2. Service Implementation
// -------------------------------------------------------------------

// PaystackClient defines the necessary Paystack configuration (API key and HTTP client).
type PaystackClient struct {
	SecretKey string
	HTTPClient *http.Client
}

// OrderServiceImpl provides methods for payment, order, and ticket business logic.
type OrderServiceImpl struct {
	
	// 🆕 Using the Repository Interface for clean dependency injection
	OrderRepo repository.OrderRepository
	PaystackClient *PaystackClient // Client for Paystack API communication
}

// NewOrderService creates a new instance of OrderServiceImpl.
func NewOrderService(orderRepo repository.OrderRepository, psClient *PaystackClient) OrderService {
    // ⚠️ Note: We no longer need the MongoDB collections here, as they are managed by the repository.
	return &OrderServiceImpl{
        OrderRepo: orderRepo, // Pass the injected repository
		PaystackClient: psClient,
	}
}

// -------------------------------------------------------------------
// Core Methods
// -------------------------------------------------------------------

// VerifyAndProcess handles the client-initiated verification flow.
func (s *OrderServiceImpl) VerifyAndProcess(ctx context.Context, reference string) (*models.Order, error) {
	// 1. Check DB for existing successful order (Idempotency check)
existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference) 


	if err == nil && existingOrder.Status == "success" {
        // 🎯 FIX: Prefix all symbols from the 'utils' package with 'utils.'
		return existingOrder, utils.NewError(
            utils.ErrConflict, 
            "Idempotency check failed", 
            utils.ErrOrderAlreadyProcessed,
        )
	}

	// 2. Call Paystack Verification API (Server-to-Server)
	paystackResp, err := s.callPaystackVerificationAPI(ctx, reference)
	if err != nil {
		return nil, fmt.Errorf("paystack verification failed: %w", err)
	}

	// 3. Status and Amount Check (Anti-Fraud)
	if paystackResp.Status != true || paystackResp.Data.Status != "success" {
		return nil, errors.New("paystack transaction was not successful")
	}

	// 4. Extract Data and Create Order
	// The metadata sent from the frontend (Log 4) is retrieved here.
	metadata := paystackResp.Data.Metadata.CustomFields 

	// 5. Create Order and Tickets (Reusable core logic)
	order, err := s.createOrderAndTickets(ctx, paystackResp.Data, metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to create order and tickets: %w", err)
	}

	return order, nil
}

// ProcessWebhook handles the server-to-server webhook notification from Paystack.
func (s *OrderServiceImpl) ProcessWebhook(ctx context.Context, payload *models.PaystackWebhook) error {
	// 1. Webhook Body Validation (Assumed done in handler/middleware, but service should re-validate data)
	// We already filtered for "charge.success" in the handler.

	reference := payload.Data.Reference

	// 2. Check DB for existing successful order (Idempotency check)
	existingOrder, err := s.OrderRepo.GetOrderByReference(ctx, reference)
	if err == nil && existingOrder.Status == "success" {
		return nil // Successfully handled (no further action needed)
	}
	
	// 3. Status Check (Should be successful, as the event is "charge.success")
	if payload.Data.Status != "success" {
		return errors.New("webhook received non-successful transaction data")
	}

	// 4. Extract Data and Create Order
	// The full order context is in the webhook payload's metadata.
	metadata := payload.Data.Metadata.CustomFields 

	// 5. Create Order and Tickets
	_, err = s.createOrderAndTickets(ctx, payload.Data, metadata)
	if err != nil {
		return fmt.Errorf("webhook processing failed during order creation: %w", err)
	}

	return nil
}


// -------------------------------------------------------------------
// Internal/Helper Methods
// -------------------------------------------------------------------

// getOrderByReference is a helper method to check the database.
func (s *OrderServiceImpl) getOrderByReference(ctx context.Context, reference string) (*models.Order, error) {
    return s.OrderRepo.GetOrderByReference(ctx, reference)
}

// callPaystackVerificationAPI simulates the server-to-server call.
func (s *OrderServiceImpl) callPaystackVerificationAPI(ctx context.Context, reference string) (*models.PaystackVerificationResponse, error) {
	// 1. Construct the URL: https://api.paystack.co/transaction/verify/:reference
	url := fmt.Sprintf("https://api.paystack.co/transaction/verify/%s", reference)

	// 2. Create the Request with required Authorization header
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.PaystackClient.SecretKey)
	req.Header.Set("Content-Type", "application/json")

	// 3. Execute the Request
	resp, err := s.PaystackClient.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	// 4. Decode and check status
	if resp.StatusCode != http.StatusOK {
		// Read body for error logging (requires io import)
		errorBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("paystack returned non-200 status: %d, body: %s", resp.StatusCode, errorBody)
	}

	var psResponse models.PaystackVerificationResponse
	// ✅ FIX: utils.DecodeJSON is now available
	if err := utils.DecodeJSON(resp.Body, &psResponse); err != nil { 
		return nil, fmt.Errorf("failed to decode paystack response: %w", err)
	}

	return &psResponse, nil
}


// createOrderAndTickets contains the core business logic for finalization.
func (s *OrderServiceImpl) createOrderAndTickets(
    ctx context.Context, 
    paystackData *models.PaystackData, 
    metadata *models.OrderMetadata,
) (*models.Order, error) {


    expectedAmountKobo := metadata.Totals.AmountInKobo
    actualAmountKobo := paystackData.Amount

    if expectedAmountKobo != actualAmountKobo {
        // Log a high-severity alert for a payment mismatch!
        return nil, fmt.Errorf(
            "fraud alert: amount mismatch detected for reference %s. Expected: %d, Actual: %d",
            paystackData.Reference, 
            expectedAmountKobo, 
            actualAmountKobo,
        )
    }

    // --- 1. DATA MAPPING to Final Order Model ---
    now := time.Now()
    newOrder := models.Order{
        // Primary ID and User Links (Assuming OrderMetadata can hold UserID if logged in)
        ID:          primitive.NewObjectID(),
        UserID:      nil, // Set this if authentication data is in the metadata
        
        // Transaction Data (from Paystack/Webhook)
        Reference:   paystackData.Reference,
        Status:      paystackData.Status, // Should be "success" if it reached here
        AmountKobo:  actualAmountKobo,
        // FeeKobo:     paystackData.Fees, // Requires adding fees to PaystackData model
        
        // Financial Totals (from secure metadata)
        Subtotal:    metadata.Totals.Subtotal,
        ServiceFee:  metadata.Totals.ServiceFee,
        VATAmount:   metadata.Totals.VATAmount,
        FinalTotal:  metadata.Totals.FinalTotal,
        
        // Nested Data (from secure metadata)
        Customer:    metadata.Customer,
        // Items:       metadata.Items, // Assuming OrderMetadata now holds the items
        
        // Timestamps
        CreatedAt:   now,
        UpdatedAt:   now,
    }
    
    // NOTE: For the items array, we must ensure OrderMetadata has an items field 
    // that matches models.OrderItem[]. For now, we will simulate the loop.
    
    // --- 2. TICKET GENERATION ---
    var ticketsToInsert []models.Ticket
    
    // Assuming metadata.Items holds the purchased items (ticket tiers)
    // We need to loop through the items list (which contains tier and quantity)
    // The following loop is conceptual, relying on the structure defined in models.Order:
    
    for _, item := range newOrder.Items { 
        for i := 0; i < item.Quantity; i++ {
            ticket := models.Ticket{
                // Fields to be generated:
                ID:          primitive.NewObjectID(),
                Code:        utils.GenerateUniqueTicketCode(newOrder.Reference, i), // Utility required here
                
                // Links and Details (from OrderItem):
                OrderID:     newOrder.ID,
                EventID:     item.EventID,
                EventTitle:  item.EventTitle,
                TierName:    item.TierName,
                Price:       item.Price, 
                
                // Denormalized Customer Info:
                OwnerEmail:  newOrder.Customer.Email,
                OwnerName:   newOrder.Customer.FirstName + " " + newOrder.Customer.LastName,
                
                IsUsed:      false,
                CreatedAt:   now,
                UpdatedAt:   now,
            }
            ticketsToInsert = append(ticketsToInsert, ticket)
        }
    }
    
    // --- 3. ATOMIC PERSISTENCE (Delegation to Repository) ---
    
 _, err := s.OrderRepo.CreateOrderAndTickets(ctx, &newOrder, ticketsToInsert)
	if err != nil {
		return nil, fmt.Errorf("failed to save order and tickets atomically: %w", err)
	}

    // --- 4. Success Response ---
    // Order is successfully saved and tickets are created.
    return &newOrder, nil
}