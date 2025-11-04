// backend/pkg/models/ticket.go
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============================================================================
// TICKET MODEL
// ============================================================================

// Ticket represents a single ticket document generated upon successful payment.
// Each ticket is uniquely identifiable and can be validated at event entry.
type Ticket struct {
	// Primary ID
	ID primitive.ObjectID `json:"id" bson:"_id,omitempty"`

	// Unique Identifier
	Code string `json:"code" bson:"code"` // Unique ticket code for QR scanning

	// Link to Parent Order and Event
	OrderID    primitive.ObjectID `json:"order_id" bson:"order_id"`
	EventID    string             `json:"event_id" bson:"event_id"`       // References Event collection
	EventTitle string             `json:"event_title" bson:"event_title"` // Denormalized for quick access

	// Ticket Details
	TierName string `json:"tier_name" bson:"tier_name"` // e.g., "VIP", "General Admission"
	Price    int    `json:"price" bson:"price"`         // Price paid for this ticket in kobo

	// Owner Information (Denormalized for quick access)
	OwnerEmail string `json:"owner_email" bson:"owner_email"`
	OwnerName  string `json:"owner_name" bson:"owner_name"`

	// Usage Tracking
	IsUsed bool       `json:"is_used" bson:"is_used"` // True when ticket has been scanned/used
	UsedAt *time.Time `json:"used_at,omitempty" bson:"used_at,omitempty"`
	UsedBy string     `json:"used_by,omitempty" bson:"used_by,omitempty"` // Staff/scanner ID who validated

	// QR Code
	QRCodeURL string `json:"qr_code_url,omitempty" bson:"qr_code_url,omitempty"` // URL or base64 of QR code

	// Timestamps
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

// IsValid returns true if the ticket can be used (not already used)
func (t *Ticket) IsValid() bool {
	return !t.IsUsed
}

// MarkAsUsed marks the ticket as used with the current timestamp and scanner ID
func (t *Ticket) MarkAsUsed(scannerID string) {
	now := time.Now()
	t.IsUsed = true
	t.UsedAt = &now
	t.UsedBy = scannerID
	t.UpdatedAt = now
}

// ============================================================================
// TICKET VALIDATION MODELS
// ============================================================================

// TicketValidationRequest represents a request to validate a ticket at entry
type TicketValidationRequest struct {
	TicketCode string `json:"ticket_code" validate:"required"`
	EventID    string `json:"event_id" validate:"required"`
	ScannerID  string `json:"scanner_id" validate:"required"`
}

// TicketValidationResponse represents the response after validating a ticket
type TicketValidationResponse struct {
	Valid   bool   `json:"valid"`
	Message string `json:"message"`
	Ticket  *Ticket `json:"ticket,omitempty"`
}

// Validation error types
const (
	ValidationErrNotFound      = "Ticket not found"
	ValidationErrAlreadyUsed   = "Ticket already used"
	ValidationErrWrongEvent    = "Ticket not valid for this event"
	ValidationErrInvalidFormat = "Invalid ticket code format"
	ValidationSuccess          = "Ticket validated successfully"
)

// ============================================================================
// TICKET QUERY MODELS
// ============================================================================

// TicketFilter represents query filters for retrieving tickets
type TicketFilter struct {
	OrderID    *primitive.ObjectID `json:"order_id,omitempty"`
	EventID    *string             `json:"event_id,omitempty"`
	OwnerEmail *string             `json:"owner_email,omitempty"`
	IsUsed     *bool               `json:"is_used,omitempty"`
	Limit      int                 `json:"limit,omitempty"`
	Skip       int                 `json:"skip,omitempty"`
}

// TicketSummary provides a lightweight view of ticket information
type TicketSummary struct {
	Code       string    `json:"code"`
	EventTitle string    `json:"event_title"`
	TierName   string    `json:"tier_name"`
	IsUsed     bool      `json:"is_used"`
	CreatedAt  time.Time `json:"created_at"`
}