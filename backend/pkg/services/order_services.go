//backend/pkg/services/order_services.go
package services

import (
	"context"
	"errors"
	"fmt"
	"time"
	"net/http"
	"encoding/json" 

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

    // 4. Parse metadata from Paystack response
    orderMetadata, err := s.parseOrderMetadata(paystackResp.Data.Metadata)
    if err != nil {
        return nil, fmt.Errorf("failed to parse order metadata: %w", err)
    }

    // 5. Create Order and Tickets (Reusable core logic)
    order, err := s.createOrderAndTickets(ctx, paystackResp.Data, orderMetadata)
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
	  orderMetadata, err := s.parseOrderMetadata(payload.Data.Metadata)
    if err != nil {
        return fmt.Errorf("failed to parse order metadata: %w", err)
    }

	// 5. Create Order and Tickets
	  _, err = s.createOrderAndTickets(ctx, payload.Data, orderMetadata)
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


func (s *OrderServiceImpl) createOrderAndTickets(
    ctx context.Context, 
    paystackData *models.PaystackData, 
    metadata *models.OrderMetadata,
) (*models.Order, error) {

    expectedAmountKobo := metadata.Totals.AmountInKobo
    actualAmountKobo := paystackData.Amount

    if expectedAmountKobo != actualAmountKobo {
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
        // Primary ID and User Links
        ID:          primitive.NewObjectID(),
        UserID:      nil, // Set this if authentication data is in the metadata
        
        // Transaction Data (from Paystack/Webhook)
        Reference:   paystackData.Reference,
        Status:      paystackData.Status,
        AmountKobo:  actualAmountKobo,
        FeeKobo:     paystackData.Fees,
        
        // Financial Totals (from secure metadata)
        Subtotal:    metadata.Totals.Subtotal,
        ServiceFee:  metadata.Totals.ServiceFee,
        VATAmount:   metadata.Totals.VATAmount,
        FinalTotal:  metadata.Totals.FinalTotal,
        
        // Nested Data (from secure metadata)
        Customer:    metadata.Customer,
        Items:       metadata.Items, // ✅ FIXED: Use metadata.Items instead of newOrder.Items
        
        // Timestamps
        CreatedAt:   now,
        UpdatedAt:   now,
    }
    
    // --- 2. TICKET GENERATION ---
    var ticketsToInsert []models.Ticket
    
    // ✅ FIXED: Loop through metadata.Items instead of newOrder.Items
    for _, item := range metadata.Items { 
        for i := 0; i < item.Quantity; i++ {
            ticket := models.Ticket{
                ID:          primitive.NewObjectID(),
                Code:        utils.GenerateUniqueTicketCode(newOrder.Reference, i),
                
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

    return &newOrder, nil
}

func (s *OrderServiceImpl) parseOrderMetadata(paystackMetadata models.PaystackMetadata) (*models.OrderMetadata, error) {
    var orderMetadata models.OrderMetadata

    // Parse cart_items from JSON string to []OrderItem
    if paystackMetadata.CartItems != "" {
        var items []models.OrderItem
        if err := json.Unmarshal([]byte(paystackMetadata.CartItems), &items); err != nil {
            return nil, fmt.Errorf("failed to parse cart_items: %w", err)
        }
        orderMetadata.Items = items
    }

    // Parse customer_info from JSON string to CustomerInfo
    if paystackMetadata.CustomerInfo != nil {
        // customer_info might be an empty object {}, so we need to check the type
        switch customerInfo := paystackMetadata.CustomerInfo.(type) {
        case string:
            if customerInfo != "" {
                var custInfo models.CustomerInfo
                if err := json.Unmarshal([]byte(customerInfo), &custInfo); err != nil {
                    return nil, fmt.Errorf("failed to parse customer_info: %w", err)
                }
                orderMetadata.Customer = custInfo
            }
        case map[string]interface{}:
            // If it's already a map, try to unmarshal it
            if len(customerInfo) > 0 {
                jsonBytes, err := json.Marshal(customerInfo)
                if err != nil {
                    return nil, fmt.Errorf("failed to marshal customer_info: %w", err)
                }
                var custInfo models.CustomerInfo
                if err := json.Unmarshal(jsonBytes, &custInfo); err != nil {
                    return nil, fmt.Errorf("failed to parse customer_info from map: %w", err)
                }
                orderMetadata.Customer = custInfo
            }
        }
    }

    // Calculate totals from the items
    if len(orderMetadata.Items) > 0 {
        var subtotal int
        for _, item := range orderMetadata.Items {
            subtotal += item.Subtotal
        }
        
        serviceFee := calculateServiceFee(subtotal)
        vatAmount := calculateVAT(subtotal)
        finalTotal := subtotal + serviceFee + vatAmount
        
        orderMetadata.Totals = models.OrderTotals{
            Subtotal:     subtotal,
            ServiceFee:   serviceFee,
            VATAmount:    vatAmount,
            FinalTotal:   finalTotal,
            AmountInKobo: finalTotal * 100, // Convert to kobo
        }
    }

    return &orderMetadata, nil
}

// Helper function to calculate service fee (adjust as needed)
func calculateServiceFee(subtotal int) int {
    // Example: 2.5% service fee
    return int(float64(subtotal) * 0.025)
}

// Helper function to calculate VAT (adjust as needed)
func calculateVAT(subtotal int) int {
    // Example: 7.5% VAT
    return int(float64(subtotal) * 0.075)
}