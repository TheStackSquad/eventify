// backend/pkg/models/order.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============================================================================
// ORDER MODELS
// ============================================================================

// OrderItem represents a single line item (e.g., a ticket type and quantity).
type OrderItem struct {
	EventID    string `json:"eventId" db:"event_id"`
	EventTitle string `json:"eventTitle" db:"event_title"`
	TierName   string `json:"tierName" db:"tier_name"`
	Quantity   int    `json:"quantity" db:"quantity"`
	Price      int    `json:"price" db:"unit_price"`    // Price per ticket
	Subtotal   int    `json:"subtotal" db:"subtotal"`   // Calculated: Price * Quantity
}

// CustomerInfo represents the billing and contact details collected from the form.
type CustomerInfo struct {
	FirstName string `json:"firstName" db:"first_name"`
	LastName  string `json:"lastName" db:"last_name"`
	Email     string `json:"email" db:"email"`
	Phone     string `json:"phone" db:"phone"`
	City      string `json:"city" db:"city"`
	State     string `json:"state" db:"state"`
	Country   string `json:"country" db:"country"`
}

// Order represents the complete transaction record.
type Order struct {
	// Primary ID and User Links
	ID     primitive.ObjectID `bson:"_id,omitempty"`
	UserID *int               `json:"userId" db:"user_id"` // Nullable if guest checkout

	// Transaction Data (from Paystack)
	Reference  string `json:"reference" db:"paystack_ref"`           // Paystack Transaction Reference
	Status     string `json:"status" db:"status"`                    // e.g., "success", "pending", "failed"
	AmountKobo int    `json:"amountKobo" db:"amount_kobo"`           // Final amount charged (in kobo)
	FeeKobo    int    `json:"feeKobo" db:"paystack_fee_kobo"`        // Paystack fee (Optional, for reconciliation)

	// Financial Totals (Verified against metadata)
	Subtotal   int `json:"subtotal" db:"subtotal"`
	ServiceFee int `json:"serviceFee" db:"service_fee"`
	VATAmount  int `json:"vatAmount" db:"vat_amount"`
	FinalTotal int `json:"finalTotal" db:"final_total"`

	// Nested Data
	Customer CustomerInfo `json:"customer" db:"-"` // Stored separately or as JSON field
	Items    []OrderItem  `json:"items" db:"-"`    // Stored as related records

	// Timestamps
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// ============================================================================
// METADATA PARSING MODELS (For extracting data from Paystack custom_fields)
// ============================================================================

// OrderMetadata represents the structured metadata we expect from frontend
// This is what you'll parse from the custom_fields in Paystack metadata
type OrderMetadata struct {
	Customer CustomerInfo `json:"customer"`
	Items    []OrderItem  `json:"items"`
	Totals   OrderTotals  `json:"totals"`
}

// OrderTotals contains the financial breakdown sent in metadata
type OrderTotals struct {
	Subtotal     int `json:"subtotal"`
	ServiceFee   int `json:"serviceFee"`
	VATAmount    int `json:"vatAmount"`
	FinalTotal   int `json:"finalTotal"`
	AmountInKobo int `json:"amountInKobo"`
}