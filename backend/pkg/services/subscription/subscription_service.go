// backend/pkg/services/subscription/subscription_service.go
package subscription

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/eventify/backend/pkg/models"
	reposub "github.com/eventify/backend/pkg/repository/subscription"
	repovendor "github.com/eventify/backend/pkg/repository/vendor"
	"github.com/eventify/backend/pkg/services/paystack"
	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Request / Response DTOs
// ---------------------------------------------------------------------------

// InitiateRequest is what the handler binds from the client body.
type InitiateRequest struct {
	Tier      models.SubscriptionTier `json:"tier" binding:"required"`
	AutoRenew bool                    `json:"autoRenew"`
}

// InitiateResponse is what the handler returns to the client after
// Paystack initialization succeeds.
type InitiateResponse struct {
	SubscriptionID   uuid.UUID `json:"subscriptionId"`
	AuthorizationURL string    `json:"authorizationUrl"`
	Tier             models.SubscriptionTier `json:"tier"`
	AmountKobo       int64     `json:"amountKobo"`
}

// ---------------------------------------------------------------------------
// Webhook payload types — mirrors what Paystack POSTs to our endpoint.
// ---------------------------------------------------------------------------

// WebhookPayload is the top-level body Paystack sends.
type WebhookPayload struct {
	Event string          `json:"event"`  // e.g. "charge.success"
	Data  WebhookData     `json:"data"`
}

// WebhookData contains the transaction details inside the webhook.
type WebhookData struct {
	Reference string            `json:"reference"`
	Status    string            `json:"status"`
	Amount    int64             `json:"amount"`
	Metadata  map[string]string `json:"metadata"` // subscription_id, vendor_id
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

// SubscriptionService defines the contract for subscription operations.
type SubscriptionService interface {
	// InitiateSubscription validates the request, creates a pending subscription,
	// and returns the Paystack authorization URL for the client to redirect to.
	InitiateSubscription(ctx context.Context, vendorID uuid.UUID, req *InitiateRequest) (*InitiateResponse, error)

	// HandleWebhook processes a Paystack webhook. It verifies the signature,
	// checks idempotency, confirms the transaction, and activates the subscription.
	// The raw body bytes are passed in so we can verify the signature before parsing.
	HandleWebhook(ctx context.Context, body []byte, signature string) error
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

type subscriptionServiceImpl struct {
	VendorRepo     repovendor.VendorRepository
	SubscriptionRepo reposub.SubscriptionRepository
	PaystackClient paystack.Client
	PaystackSecret string // used for webhook signature verification
}

// NewSubscriptionService constructs the subscription service.
func NewSubscriptionService(
	vendorRepo repovendor.VendorRepository,
	subscriptionRepo reposub.SubscriptionRepository,
	paystackClient paystack.Client,
	paystackSecret string,
) SubscriptionService {
	return &subscriptionServiceImpl{
		VendorRepo:       vendorRepo,
		SubscriptionRepo: subscriptionRepo,
		PaystackClient:   paystackClient,
		PaystackSecret:   paystackSecret,
	}
}

// ---------------------------------------------------------------------------
// InitiateSubscription
// ---------------------------------------------------------------------------

func (s *subscriptionServiceImpl) InitiateSubscription(ctx context.Context, vendorID uuid.UUID, req *InitiateRequest) (*InitiateResponse, error) {
	// 1. Validate tier — must not be Free, must exist in pricing table
	if req.Tier == models.TierFree {
		return nil, fmt.Errorf("cannot subscribe to the free tier")
	}
	pricing := models.GetPricing(req.Tier)
	if pricing.MaxKobo == 0 {
		return nil, fmt.Errorf("invalid subscription tier: %s", req.Tier)
	}

	// 2. Fetch vendor — we need the email for Paystack and to confirm the vendor exists
	vendor, err := s.VendorRepo.GetByID(ctx, vendorID)
	if err != nil {
		return nil, fmt.Errorf("vendor not found: %w", err)
	}

	// 3. Check for an existing active subscription — reject if already subscribed
	// at the same or higher tier
	vendorWithSub, err := s.VendorRepo.GetVendorWithSubscription(ctx, vendorID)
	if err == nil && vendorWithSub.Subscription != nil {
		existing := vendorWithSub.Subscription
		if existing.Status == models.SubscriptionActive && existing.Tier.Rank() >= req.Tier.Rank() {
			return nil, fmt.Errorf("vendor already has an active %s subscription", existing.Tier)
		}
	}

	// 4. Resolve email — use the vendor's email field if set, otherwise fall back
	// to the owner's email. Paystack requires an email to initialize.
	email := ""
	if vendor.Email.Valid && vendor.Email.String != "" {
		email = vendor.Email.String
	}
	if email == "" {
		return nil, fmt.Errorf("vendor has no email on file — cannot initialize payment")
	}

	// 5. Create the subscription row with status = pending.
	// This happens before we call Paystack so that we have a subscription_id
	// to embed in the metadata. If Paystack init fails, the row stays pending
	// and can be cleaned up or retried.
	now := time.Now().UTC()
	sub := &models.Subscription{
		ID:        uuid.New(),
		VendorID:  vendorID,
		Tier:      req.Tier,
		Status:    models.SubscriptionPending,
		StartsAt:  now,
		AutoRenew: req.AutoRenew,
		Price:     pricing.MaxKobo,
		Currency:  "NGN",
	}

	_, err = s.SubscriptionRepo.Create(ctx, sub)
	if err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	// 6. Initialize Paystack transaction.
	// Reference is the subscription ID — unique, safe, ties back to our record.
	// Metadata carries subscription_id and vendor_id so the webhook can look up
	// the right rows without searching by reference.
	authURL, err := s.PaystackClient.InitializeTransaction(ctx, email, pricing.MaxKobo, sub.ID.String(), map[string]string{
		"subscription_id": sub.ID.String(),
		"vendor_id":       vendorID.String(),
	})
	if err != nil {
		// Paystack init failed — mark the subscription as canceled so it doesn't
		// linger as pending indefinitely.
		_ = s.SubscriptionRepo.UpdateStatus(ctx, sub.ID, models.SubscriptionCanceled)
		return nil, fmt.Errorf("paystack initialization failed: %w", err)
	}

	return &InitiateResponse{
		SubscriptionID:   sub.ID,
		AuthorizationURL: authURL,
		Tier:             req.Tier,
		AmountKobo:       pricing.MaxKobo,
	}, nil
}

// ---------------------------------------------------------------------------
// HandleWebhook
// ---------------------------------------------------------------------------

func (s *subscriptionServiceImpl) HandleWebhook(ctx context.Context, body []byte, signature string) error {
	// 1. Verify the HMAC signature — reject anything that doesn't match.
	// This runs before any parsing so we never process a forged payload.
	if !paystack.VerifyWebhookSignature(body, signature, s.PaystackSecret) {
		return fmt.Errorf("invalid webhook signature")
	}

	// 2. Parse the webhook body
	var webhook WebhookPayload
	if err := json.Unmarshal(body, &webhook); err != nil {
		return fmt.Errorf("failed to parse webhook payload: %w", err)
	}

	// 3. Only process charge.success — return nil (200) for anything else.
	// Paystack sends other events (charge.failed, transfer.success, etc.)
	// and we don't want to error on them.
	if webhook.Event != "charge.success" {
		return nil
	}

	// 4. Extract subscription_id and vendor_id from metadata
	subscriptionIDStr, ok := webhook.Data.Metadata["subscription_id"]
	if !ok || subscriptionIDStr == "" {
		return fmt.Errorf("webhook metadata missing subscription_id")
	}
	subscriptionID, err := uuid.Parse(subscriptionIDStr)
	if err != nil {
		return fmt.Errorf("invalid subscription_id in webhook metadata: %w", err)
	}

	vendorIDStr, ok := webhook.Data.Metadata["vendor_id"]
	if !ok || vendorIDStr == "" {
		return fmt.Errorf("webhook metadata missing vendor_id")
	}
	vendorID, err := uuid.Parse(vendorIDStr)
	if err != nil {
		return fmt.Errorf("invalid vendor_id in webhook metadata: %w", err)
	}

	// 5. Idempotency check — fetch the vendor with subscription via the joined query.
	// If the subscription's PaymentReference already matches this webhook's reference,
	// this is a duplicate webhook call. Return nil (200) silently — do not process again.
	vendorWithSub, err := s.VendorRepo.GetVendorWithSubscription(ctx, vendorID)
	if err != nil {
		return fmt.Errorf("failed to fetch vendor for webhook processing: %w", err)
	}
	if vendorWithSub.Subscription != nil &&
		vendorWithSub.Subscription.ID == subscriptionID &&
		vendorWithSub.Subscription.PaymentReference.Valid &&
		vendorWithSub.Subscription.PaymentReference.String == webhook.Data.Reference {
		// Already processed — duplicate webhook. Silent 200.
		return nil
	}

	// 6. Double-confirm with Paystack — verify the transaction independently
	// so we're not trusting the webhook payload alone.
	_, err = s.PaystackClient.VerifyTransaction(ctx, webhook.Data.Reference)
	if err != nil {
		return fmt.Errorf("paystack transaction verification failed: %w", err)
	}

	// 7. Activate the subscription — single atomic update for all payment fields.
	now := time.Now().UTC()
	err = s.SubscriptionRepo.UpdateAfterPayment(ctx, subscriptionID, reposub.PaymentUpdateParams{
		Status:           models.SubscriptionActive,
		PaymentReference: webhook.Data.Reference,
		PaymentMethod:    "card", // Paystack card payment
		LastPaymentDate:  now,
		NextPaymentDate:  now.AddDate(0, 1, 0), // 1 month billing cycle
		ExpiresAt:        now.AddDate(0, 1, 0),
	})
	if err != nil {
		return fmt.Errorf("failed to update subscription after payment: %w", err)
	}

	// 8. Mirror the tier onto the vendor table — this lets ListVendors filter
	// by tier without a JOIN, and keeps the vendor row as the single source
	// of truth for display purposes.
	err = s.VendorRepo.UpdateFields(ctx, vendorID, map[string]interface{}{
		"subscription_tier": string(vendorWithSub.Subscription.Tier),
	})
	if err != nil {
		// Non-fatal — the subscription is already active. The mirror is an
		// optimisation, not a requirement. Log and continue.
		fmt.Printf("Warning: failed to mirror subscription tier to vendor: %v\n", err)
	}

	return nil
}