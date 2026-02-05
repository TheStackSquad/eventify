// backend/pkg/services/subscription/subscription_service.go
package subscription

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/eventify/backend/pkg/models"
	reposub "github.com/eventify/backend/pkg/repository/subscription"
	repovendor "github.com/eventify/backend/pkg/repository/vendor"
	"github.com/eventify/backend/pkg/services/paystack"
	"github.com/google/uuid"
)

// InitiateRequest DTO for subscription initiation
type InitiateRequest struct {
	Tier      models.SubscriptionTier `json:"tier" binding:"required"`
	AutoRenew bool                    `json:"autoRenew"`
}

// InitiateResponse DTO for subscription initiation response
type InitiateResponse struct {
	SubscriptionID   uuid.UUID               `json:"subscriptionId"`
	AuthorizationURL string                  `json:"authorizationUrl"`
	Tier             models.SubscriptionTier `json:"tier"`
	AmountKobo       int64                   `json:"amountKobo"`
}

// WebhookPayload represents Paystack webhook data
type WebhookPayload struct {
	Event string      `json:"event"`
	Data  WebhookData `json:"data"`
}

// WebhookData contains payment details
type WebhookData struct {
	Reference string            `json:"reference"`
	Status    string            `json:"status"`
	Amount    int64             `json:"amount"`
	Metadata  map[string]string `json:"metadata"`
}

// SubscriptionService defines subscription business logic
type SubscriptionService interface {
	InitiateSubscription(ctx context.Context, vendorID uuid.UUID, req *InitiateRequest) (*InitiateResponse, error)
	HandleWebhook(ctx context.Context, body []byte, signature string) error
}

type subscriptionServiceImpl struct {
	vendorRepo       repovendor.VendorRepository
	subscriptionRepo reposub.SubscriptionRepository
	paystack         paystack.Client
	webhookSecret    string
}

// NewSubscriptionService creates subscription service instance
func NewSubscriptionService(
	vr repovendor.VendorRepository,
	sr reposub.SubscriptionRepository,
	pc paystack.Client,
	secret string,
) SubscriptionService {
	return &subscriptionServiceImpl{
		vendorRepo:       vr,
		subscriptionRepo: sr,
		paystack:         pc,
		webhookSecret:    secret,
	}
}

// InitiateSubscription handles pre-payment logic and Paystack integration
func (s *subscriptionServiceImpl) InitiateSubscription(ctx context.Context, vendorID uuid.UUID, req *InitiateRequest) (*InitiateResponse, error) {
	if req.Tier == models.TierFree {
		return nil, fmt.Errorf("cannot subscribe to the free tier")
	}
	pricing := models.GetPricing(req.Tier)
	if pricing.MaxKobo == 0 {
		return nil, fmt.Errorf("invalid subscription tier: %s", req.Tier)
	}

	vendorWithSub, err := s.vendorRepo.GetVendorSubscription(ctx, vendorID)
	if err == nil && vendorWithSub.Subscription != nil {
		sub := vendorWithSub.Subscription
		if sub.Status == models.SubStatusActive && sub.Tier.Rank() >= req.Tier.Rank() {
			return nil, fmt.Errorf("vendor already has an active %s subscription", sub.Tier)
		}
		if sub.Status == models.SubStatusPending && time.Since(sub.CreatedAt) < 10*time.Minute {
			return nil, fmt.Errorf("a payment is already pending; please try again in 10 minutes")
		}
	}

	vendor, err := s.vendorRepo.GetByID(ctx, vendorID)
	if err != nil {
		return nil, fmt.Errorf("vendor record not found: %w", err)
	}

	email := ""
	if vendor.Email.Valid {
		email = vendor.Email.String
	}
	if email == "" {
		return nil, fmt.Errorf("vendor lacks a valid email for payment processing")
	}

	sub := &models.Subscription{
		ID:        uuid.New(),
		VendorID:  vendorID,
		Tier:      req.Tier,
		Status:    models.SubStatusPending,
		StartsAt:  time.Now().UTC(),
		AutoRenew: req.AutoRenew,
		Price:     pricing.MaxKobo,
		Currency:  "NGN",
	}

	if _, err = s.subscriptionRepo.Create(ctx, sub); err != nil {
		return nil, fmt.Errorf("failed to persist pending subscription: %w", err)
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	callback := fmt.Sprintf("%s/subscription/callback", frontendURL)
	metadata := map[string]string{
		"subscription_id": sub.ID.String(),
		"vendor_id":       vendorID.String(),
	}

	authURL, err := s.paystack.InitializeTransaction(ctx, email, pricing.MaxKobo, sub.ID.String(), metadata, callback)
	if err != nil {
		_ = s.subscriptionRepo.UpdateStatus(ctx, sub.ID, models.SubStatusCancelled)
		return nil, fmt.Errorf("gateway initialization failed: %w", err)
	}

	return &InitiateResponse{
		SubscriptionID:   sub.ID,
		AuthorizationURL: authURL,
		Tier:             req.Tier,
		AmountKobo:       pricing.MaxKobo,
	}, nil
}

// HandleWebhook processes Paystack payment confirmations
func (s *subscriptionServiceImpl) HandleWebhook(ctx context.Context, body []byte, signature string) error {
	if !paystack.VerifyWebhookSignature(body, signature, s.webhookSecret) {
		return fmt.Errorf("unauthorized: invalid webhook signature")
	}

	var payload WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return fmt.Errorf("failed to decode payload: %w", err)
	}

	if payload.Event != "charge.success" {
		return nil
	}

	subID, err := uuid.Parse(payload.Data.Metadata["subscription_id"])
	if err != nil {
		return fmt.Errorf("missing subscription_id in metadata")
	}
	vendorID, err := uuid.Parse(payload.Data.Metadata["vendor_id"])
	if err != nil {
		return fmt.Errorf("missing vendor_id in metadata")
	}

	vendorWithSub, err := s.vendorRepo.GetVendorSubscription(ctx, vendorID)
	if err != nil {
		return fmt.Errorf("failed to verify vendor state: %w", err)
	}

	if vendorWithSub.Subscription != nil && 
	   vendorWithSub.Subscription.PaymentReference.String == payload.Data.Reference {
		return nil 
	}

	if vendorWithSub.Subscription == nil || vendorWithSub.Subscription.ID != subID {
		return fmt.Errorf("security alert: subscription mismatch for vendor %s", vendorID)
	}

	if payload.Data.Amount != vendorWithSub.Subscription.Price {
		return fmt.Errorf("price mismatch: expected %d, got %d", vendorWithSub.Subscription.Price, payload.Data.Amount)
	}

	if _, err = s.paystack.VerifyTransaction(ctx, payload.Data.Reference); err != nil {
		return fmt.Errorf("gateway transaction verification failed: %w", err)
	}

	now := time.Now().UTC()
	expiry := now.AddDate(0, 1, 0)
	params := reposub.PaymentUpdateParams{
		Status:            models.SubStatusActive,
		PaymentReference:  payload.Data.Reference,
		PaymentMethod:     "card",
		LastPaymentDate:   now,
		NextPaymentDate:   expiry,
		ExpiresAt:         expiry,
	}

	if err = s.subscriptionRepo.UpdateAfterPayment(ctx, subID, params); err != nil {
		return fmt.Errorf("critical: failed to activate subscription record: %w", err)
	}

	updateMap := map[string]interface{}{"subscription_tier": string(vendorWithSub.Subscription.Tier)}
	if err = s.vendorRepo.UpdateFields(ctx, vendorID, updateMap); err != nil {
		fmt.Printf("[Warning] Tier mirror failed for vendor %s: %v\n", vendorID, err)
	}

	return nil
}