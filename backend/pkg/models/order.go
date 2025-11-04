//backend/pkg/models/order.go
package models

import (
	"errors"
	"strings"
	"time"

	"eventify/backend/pkg/shared"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============================================================================
// ORDER ITEM MODELS
// ============================================================================

// OrderItem represents a single line item in an order.
// This structure is used for the FINAL, SERVER-CALCULATED Order database record.
// NOTE: All prices are in Kobo (int).
type OrderItem struct {
	EventID string `json:"event_id" bson:"event_id" validate:"required"`
	EventTitle string `json:"event_title" bson:"event_title" validate:"required"`
	TierName string `json:"tier_name" bson:"tier_name" validate:"required"`
	Quantity int `json:"quantity" bson:"quantity" validate:"required,min=1,max=100"`
	// Price MUST be populated by the server via a database lookup.
	Price int `json:"unit_price" bson:"unit_price"` 
	Subtotal int `json:"subtotal" bson:"subtotal"`
}

// Validate performs validation on OrderItem (used for the final DB record).
func (i *OrderItem) Validate() error {
	if i.EventID == "" {
		return errors.New("event_id is required")
	}
	if i.EventTitle == "" {
		return errors.New("event_title is required")
	}
	if i.Quantity < 1 || i.Quantity > 100 {
		return errors.New("quantity must be between 1 and 100")
	}
	// Note: We don't check Price < 0 here as the server should guarantee this.
	return nil
}

// ============================================================================
// CUSTOMER INFO MODELS
// ============================================================================

// CustomerInfo represents the billing and contact details collected from the customer.
type CustomerInfo struct {
	FirstName string `json:"first_name" bson:"first_name" validate:"required"`
	LastName string `json:"last_name" bson:"last_name" validate:"required"`
	Email  string `json:"email" bson:"email" validate:"required,email"`
	Phone  string `json:"phone" bson:"phone" validate:"required"`
	City string `json:"city" bson:"city"`
	State  string `json:"state" bson:"state"`
	Country string `json:"country" bson:"country" validate:"required"`
}

// Validate performs validation on CustomerInfo
func (c *CustomerInfo) Validate() error {
	if strings.TrimSpace(c.FirstName) == "" {
		return errors.New("first_name is required")
	}
	if strings.TrimSpace(c.LastName) == "" {
		return errors.New("last_name is required")
	}
	if !strings.Contains(c.Email, "@") {
		return errors.New("invalid email format")
	}
	if strings.TrimSpace(c.Phone) == "" {
		return errors.New("phone is required")
	}
	if strings.TrimSpace(c.Country) == "" {
		return errors.New("country is required")
	}
	return nil
}

// ============================================================================
// ORDER INITIALIZATION REQUEST (INPUT MODEL)
// ============================================================================

// OrderItemRequest is the minimal structure received from the client for an item.
// It contains identification, but NO price information.
type OrderItemRequest struct {
	EventID string `json:"event_id" validate:"required"`
	TierName  string `json:"tier_name" validate:"required"`
	Quantity  int `json:"quantity" validate:"required,min=1,max=100"`
}

// OrderInitializationRequest represents the minimal payload from frontend to create a pending order.
// The client MUST NOT submit any price fields.
type OrderInitializationRequest struct {
	Email string `json:"email" validate:"required,email"`
	// REMOVED: AmountKobo, Subtotal, ServiceFee, VATAmount
	Items []OrderItemRequest `json:"items" validate:"required,min=1,dive"`
	Customer  CustomerInfo  `json:"customer" validate:"required"`
}

// Validate performs basic format validation on the request.
// NOTE: All financial validation is now done in the Service layer after price lookups.
func (r *OrderInitializationRequest) Validate() error {
	if r.Email == "" || !strings.Contains(r.Email, "@") {
		return errors.New("invalid email address")
	}

	if len(r.Items) == 0 {
		return errors.New("order must contain at least one item")
	}

	if err := r.Customer.Validate(); err != nil {
		return err
	}
	
	// Basic item checks (excluding price/subtotal checks which are now server-side)
	for _, item := range r.Items {
		if item.EventID == "" || item.TierName == "" || item.Quantity < 1 {
			return errors.New("item validation failed: missing ID, tier, or quantity")
		}
	}

	return nil
}

// ============================================================================
// ORDER MODEL (Main Transaction Record)
// ============================================================================

// Order represents the complete transaction record stored in the database.
// This structure remains unchanged as it stores the final, server-calculated state.
type Order struct {
	// Primary ID and User Links
	ID  primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID *primitive.ObjectID `json:"user_id,omitempty" bson:"user_id,omitempty"`

	// Transaction Data
	Reference string `json:"reference" bson:"reference"`
	Status string `json:"status" bson:"status" validate:"oneof=pending success failed fraud"`
	AmountKobo int `json:"amount_kobo" bson:"amount_kobo"`
	FeeKobo int `json:"fee_kobo" bson:"fee_kobo"`

	// Financial Totals (for analytics and reporting - all in Kobo)
	Subtotal  int `json:"subtotal" bson:"subtotal"`
	ServiceFee int `json:"service_fee" bson:"service_fee"`
	VATAmount int `json:"vat_amount" bson:"vat_amount"`
	FinalTotal int `json:"final_total" bson:"final_total"`

	// Payment Channel Info
	PaymentChannel string `json:"payment_channel,omitempty" bson:"payment_channel,omitempty"`
	PaidAt  *time.Time `json:"paid_at,omitempty" bson:"paid_at,omitempty"`

	// Nested Data
	Customer CustomerInfo `json:"customer" bson:"customer"`
	Items    []OrderItem `json:"items" bson:"items"`

	// Timestamps
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`

	// Audit Fields (for security and debugging)
	IPAddress string `json:"ip_address,omitempty" bson:"ip_address,omitempty"`
	UserAgent  string `json:"user_agent,omitempty" bson:"user_agent,omitempty"`
	ProcessedBy  string `json:"processed_by,omitempty" bson:"processed_by,omitempty"` // "webhook" or "verification"
	WebhookAttempts int `json:"webhook_attempts,omitempty" bson:"webhook_attempts,omitempty"`
}

// IsProcessed returns true if order is in a final state
func (o *Order) IsProcessed() bool {
	return o.Status == "success" || o.Status == "failed" || o.Status == "fraud"
}

// IsPending returns true if order is still awaiting payment confirmation
func (o *Order) IsPending() bool {
	return o.Status == "pending"
}

// IsSuccess returns true if order was successfully paid
func (o *Order) IsSuccess() bool {
	return o.Status == "success"
}

// ============================================================================
// FEE CALCULATION HELPERS
// ============================================================================
// NOTE: These functions delegate to shared/fee_config.go for centralized logic

// CalculateServiceFee calculates the service fee using the tiered percentage model.
// See shared/fee_config.go for detailed tier breakdown.
func CalculateServiceFee(subtotal int) int {
	return shared.CalculateServiceFee(subtotal)
}

// CalculateVAT calculates the VAT (7.5%) on the given amount.
// See shared/fee_config.go for implementation.
func CalculateVAT(amount int) int {
	return shared.CalculateVAT(amount)
}

// CalculateTotals is a helper that calculates all financial totals for an order based on items.
// Returns: subtotal, serviceFee, vatAmount, finalTotal (all in Kobo)
func CalculateTotals(items []OrderItem) (int, int, int, int) {
	subtotal := 0
	for _, item := range items {
		// IMPORTANT: This calculation assumes item.Price has been set by the server.
		subtotal += item.Price * item.Quantity
	}
	
	// Use centralized calculation from shared config
	return shared.CalculateOrderTotals(subtotal)
}
