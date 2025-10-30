//backend/pkg/models/paystac_models.go
package models

// PaystackVerificationResponse models the response from the /transaction/verify/:reference API endpoint.
type PaystackVerificationResponse struct {
	Status  bool          `json:"status"`  // true if the API call was successful
	Message string        `json:"message"`
	Data    *PaystackData `json:"data"`    // Contains the actual transaction details
}

// PaystackWebhook models the body received from the Paystack webhook POST request.
type PaystackWebhook struct {
	Event string        `json:"event"` // e.g., "charge.success", "transfer.success"
	Data  *PaystackData `json:"data"`
}

// PaystackData contains the core transaction details, present in both verification and webhook responses.
type PaystackData struct {
	ID        int64              `json:"id"`
	Domain    string             `json:"domain"`
	Status    string             `json:"status"`    // "success", "failed", "abandoned"
	Reference string             `json:"reference"` // The unique transaction reference (TIX_...)
	Amount    int                `json:"amount"`    // Actual amount charged (in kobo)
	GatewayResponse string       `json:"gateway_response"`
	PaidAt    *string            `json:"paid_at"`
	Channel   string             `json:"channel"`
	Currency  string             `json:"currency"`
	// The Metadata field contains the custom data you sent to Paystack during initiation.
	Metadata  *PaystackMetadata  `json:"metadata"` 
	Customer  struct {
		ID    int64  `json:"id"`
		Email string `json:"email"`
	} `json:"customer"`
}

// PaystackMetadata models the structured metadata field where we store order details.
// This is the CRITICAL security component for fraud checking.
type PaystackMetadata struct {
	CustomFields *OrderMetadata `json:"custom_fields"` // Assuming custom fields is an array in Paystack, but we'll map directly to our struct
}

// OrderMetadata mirrors the expected JSON structure you sealed into the Paystack request.
// This contains the data needed for order creation and fraud reconciliation.
type OrderMetadata struct {
	Customer CustomerInfo `json:"customerInfo"` // Your initial customer data (Log 1)
	Totals   struct {
		Subtotal     int `json:"subtotal"`
		ServiceFee   int `json:"serviceFee"`
		VATAmount    int `json:"vatAmount"`
		FinalTotal   int `json:"finalTotal"`
		AmountInKobo int `json:"amountInKobo"` // The EXPECTED amount (Crucial for fraud check!)
	} `json:"orderTotals"` // Your initial financial totals (Log 2)
	// You may need an array of OrderItem structs here if not embedded in the main Order struct
	// Items []OrderItem `json:"cartItems"`
}