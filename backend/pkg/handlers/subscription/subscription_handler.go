// backend/pkg/handlers/subscription/subscription_handler.go
package handlers

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/eventify/backend/pkg/models"
	repovendor "github.com/eventify/backend/pkg/repository/vendor"
	servicesubscription "github.com/eventify/backend/pkg/services/subscription"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// SubscriptionHandler handles HTTP requests for subscription operations.
type SubscriptionHandler struct {
	Service    servicesubscription.SubscriptionService
	VendorRepo repovendor.VendorRepository // for GetMySubscription reads
}

// NewSubscriptionHandler constructs the handler.
func NewSubscriptionHandler(
	service servicesubscription.SubscriptionService,
	vendorRepo repovendor.VendorRepository,
) *SubscriptionHandler {
	return &SubscriptionHandler{
		Service:    service,
		VendorRepo: vendorRepo,
	}
}

// ---------------------------------------------------------------------------
// InitiateSubscription — POST /api/subscription/initiate
// Auth-only. Validates the tier, creates a pending subscription, and returns
// the Paystack authorization URL for the client to redirect to.
// ---------------------------------------------------------------------------

func (h *SubscriptionHandler) InitiateSubscription(c *gin.Context) {
	// 1. Extract vendor ID from auth context
	vendorID, err := extractVendorID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": err.Error()})
		return
	}

	// 2. Bind request body
	var req servicesubscription.InitiateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid request: " + err.Error()})
		return
	}

	// 3. Call service
	resp, err := h.Service.InitiateSubscription(c.Request.Context(), vendorID, &req)
	if err != nil {
		log.Error().Err(err).Str("vendorID", vendorID.String()).Str("tier", string(req.Tier)).Msg("Subscription initiation failed")

		// Surface known validation errors as 400/409, everything else as 500
		msg := err.Error()
		switch {
		case msg == "cannot subscribe to the free tier",
			strings.HasPrefix(msg, "invalid subscription tier"):
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": msg})
		case strings.Contains(msg, "already has an active"):
			c.JSON(http.StatusConflict, gin.H{"status": "error", "message": msg})
		case strings.Contains(msg, "no email on file"):
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": msg})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to initiate subscription"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   resp,
	})
}

// ---------------------------------------------------------------------------
// HandleWebhook — POST /subscription/webhook
// Public route — no auth. Paystack POSTs here after payment.
// Signature verification happens inside the service before any payload is parsed.
// We read the raw body here and pass it to the service so the signature check
// runs against the exact bytes Paystack sent (not a re-serialised struct).
// ---------------------------------------------------------------------------

func (h *SubscriptionHandler) HandleWebhook(c *gin.Context) {
	// 1. Read raw body — must happen before any binding or parsing
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read webhook body")
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Failed to read request body"})
		return
	}

	// 2. Pull the signature header Paystack attaches
	signature := c.GetHeader("X-Paystack-Signature")

	// 3. Hand everything to the service — it verifies, checks idempotency,
	// confirms with Paystack, and activates the subscription if all checks pass.
	err = h.Service.HandleWebhook(c.Request.Context(), body, signature)
	if err != nil {
		// Signature failures and parse errors are the only things we want to
		// surface as non-200. Everything else (duplicate webhook, non-charge event)
		// returns nil from the service and we respond 200 here.
		if err.Error() == "invalid webhook signature" {
			log.Warn().Msg("Webhook rejected: invalid signature")
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Invalid signature"})
			return
		}
		log.Error().Err(err).Msg("Webhook processing failed")
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Webhook processing failed"})
		return
	}

	// Always return 200 to Paystack — if we don't, they retry.
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// ---------------------------------------------------------------------------
// GetMySubscription — GET /api/subscription/me
// Auth-only. Returns the vendor's current subscription and resolved features.
// ---------------------------------------------------------------------------

func (h *SubscriptionHandler) GetMySubscription(c *gin.Context) {
	// 1. Extract vendor ID from auth context
	vendorID, err := extractVendorID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": err.Error()})
		return
	}

	// 2. Fetch vendor + subscription in one joined query
	vendorWithSub, err := h.VendorRepo.GetVendorWithSubscription(c.Request.Context(), vendorID)
	if err != nil {
		log.Error().Err(err).Str("vendorID", vendorID.String()).Msg("Failed to fetch subscription")
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch subscription"})
		return
	}

	// 3. Build response — if no subscription exists, return Free tier with features
	response := gin.H{
		"tier":     models.TierFree,
		"features": models.GetFeatures(models.TierFree),
	}

	if vendorWithSub.Subscription != nil {
		response = gin.H{
			"subscription": vendorWithSub.Subscription,
			"tier":         vendorWithSub.Subscription.Tier,
			"features":     vendorWithSub.Features,
			"isFeatured":   vendorWithSub.IsFeatured,
			"badgeColor":   vendorWithSub.BadgeColor,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// extractVendorID pulls the vendor_id from the gin auth context.
// The auth middleware sets this after validating the JWT.
func extractVendorID(c *gin.Context) (uuid.UUID, error) {
	val, exists := c.Get("vendor_id")
	if !exists {
		return uuid.Nil, fmt.Errorf("vendor identity not found — authentication required")
	}
	vendorID, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil, fmt.Errorf("invalid vendor_id in auth context")
	}
	return vendorID, nil
}