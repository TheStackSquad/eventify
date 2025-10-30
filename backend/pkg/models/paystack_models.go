// backend/pkg/models/paystack_models.go
package models

// ============================================================================
// PAYSTACK API MODELS
// ============================================================================

// PaystackVerificationResponse is the top-level response from Paystack's verify endpoint
type PaystackVerificationResponse struct {
	Status  bool          `json:"status"`
	Message string        `json:"message"`
	Data    *PaystackData `json:"data"`
}

// PaystackData contains the transaction details from Paystack
type PaystackData struct {
	ID                 int64                  `json:"id"`
	Domain             string                 `json:"domain"`
	Status             string                 `json:"status"`
	Reference          string                 `json:"reference"`
	ReceiptNumber      *string                `json:"receipt_number"`
	Amount             int                    `json:"amount"`
	Message            *string                `json:"message"`
	GatewayResponse    string                 `json:"gateway_response"`
	PaidAt             string                 `json:"paid_at"`
	CreatedAt          string                 `json:"created_at"`
	Channel            string                 `json:"channel"`
	Currency           string                 `json:"currency"`
	IPAddress          string                 `json:"ip_address"`
	Metadata           PaystackMetadata       `json:"metadata"`
	Log                *PaystackLog           `json:"log,omitempty"`
	Fees               int                    `json:"fees"`
	FeesSplit          interface{}            `json:"fees_split"`
	Authorization      *PaystackAuthorization `json:"authorization,omitempty"`
	Customer           *PaystackCustomer      `json:"customer,omitempty"`
	Plan               interface{}            `json:"plan"`
	Split              interface{}            `json:"split"`
	OrderID            *string                `json:"order_id"`
	RequestedAmount    int                    `json:"requested_amount"`
	PosTransactionData interface{}            `json:"pos_transaction_data"`
	Source             *string                `json:"source"`
	FeesBreakdown      interface{}            `json:"fees_breakdown"`
	Connect            interface{}            `json:"connect"`
	TransactionDate    string                 `json:"transaction_date"`
	PlanObject         interface{}            `json:"plan_object"`
	Subaccount         interface{}            `json:"subaccount"`
}

// PaystackMetadata contains custom metadata sent with the transaction
type PaystackMetadata struct {
	CartItems    string        `json:"cart_items"`
	CustomerInfo interface{}   `json:"customer_info"`
	Reference    string        `json:"reference"`
	Timestamp    string        `json:"timestamp"`
	Referrer     string        `json:"referrer"`
	CustomFields []CustomField `json:"custom_fields,omitempty"` // For structured metadata
}

// CustomField represents a custom field in Paystack metadata
type CustomField struct {
	DisplayName  string `json:"display_name"`
	VariableName string `json:"variable_name"`
	Value        string `json:"value"`
}

// PaystackLog contains transaction processing logs
type PaystackLog struct {
	StartTime int64              `json:"start_time"`
	TimeSpent int                `json:"time_spent"`
	Attempts  int                `json:"attempts"`
	Errors    int                `json:"errors"`
	Success   bool               `json:"success"`
	Mobile    bool               `json:"mobile"`
	Input     []interface{}      `json:"input"`
	History   []PaystackLogEntry `json:"history"`
}

// PaystackLogEntry represents a single log entry
type PaystackLogEntry struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	Time    int    `json:"time"`
}

// PaystackAuthorization contains card authorization details
type PaystackAuthorization struct {
	AuthorizationCode         string  `json:"authorization_code"`
	Bin                       string  `json:"bin"`
	Last4                     string  `json:"last4"`
	ExpMonth                  string  `json:"exp_month"`
	ExpYear                   string  `json:"exp_year"`
	Channel                   string  `json:"channel"`
	CardType                  string  `json:"card_type"`
	Bank                      string  `json:"bank"`
	CountryCode               string  `json:"country_code"`
	Brand                     string  `json:"brand"`
	Reusable                  bool    `json:"reusable"`
	Signature                 string  `json:"signature"`
	AccountName               *string `json:"account_name"`
	ReceiverBankAccountNumber *string `json:"receiver_bank_account_number"`
	ReceiverBank              *string `json:"receiver_bank"`
}

// PaystackCustomer contains customer information from Paystack
type PaystackCustomer struct {
	ID                       int64       `json:"id"`
	FirstName                string      `json:"first_name"`
	LastName                 string      `json:"last_name"`
	Email                    string      `json:"email"`
	CustomerCode             string      `json:"customer_code"`
	Phone                    string      `json:"phone"`
	Metadata                 interface{} `json:"metadata"`
	RiskAction               string      `json:"risk_action"`
	InternationalFormatPhone *string     `json:"international_format_phone"`
}

// PaystackWebhook represents the webhook payload from Paystack
type PaystackWebhook struct {
	Event string        `json:"event"`
	Data  *PaystackData `json:"data"`
}

// ============================================================================
// PAYSTACK REQUEST MODELS
// ============================================================================

// PaystackInitializeRequest represents the request to initialize a transaction
type PaystackInitializeRequest struct {
	Email     string                 `json:"email"`
	Amount    int                    `json:"amount"`
	Reference string                 `json:"reference"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	CallbackURL string               `json:"callback_url,omitempty"`
	Channels   []string              `json:"channels,omitempty"`
}

// PaystackInitializeResponse represents the response from initializing a transaction
type PaystackInitializeResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		AuthorizationURL string `json:"authorization_url"`
		AccessCode       string `json:"access_code"`
		Reference        string `json:"reference"`
	} `json:"data"`
}

// ============================================================================
// PAYMENT SERVICE MODELS
// ============================================================================

// PaymentVerificationRequest represents the request to verify a payment
type PaymentVerificationRequest struct {
	Reference string `json:"reference" validate:"required"`
}

// PaymentVerificationResponse represents the response after payment verification
type PaymentVerificationResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PaymentError represents a standardized payment error response
type PaymentError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}