package handlers

import (
	"context"
	"net/http"
	"time"
	"errors" // Standard Go errors package

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"
	"eventify/backend/pkg/utils" // Assuming this package contains utility functions like error wrapping

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// OrderHandler holds the service dependencies required for payment processing.
type OrderHandler struct {
	OrderService services.OrderService // Interface for core order and payment business logic
}

// NewOrderHandler creates a new instance of OrderHandler.
func NewOrderHandler(orderService services.OrderService) *OrderHandler {
	return &OrderHandler{
		OrderService: orderService,
	}
}

// -------------------------------------------------------------------
// 1. Client-Initiated Verification Handler (From confirmation/page.js)
// -------------------------------------------------------------------

// VerifyPayment handles the client request to verify a Paystack transaction reference.
// Endpoint: GET /api/payments/verify/:reference
func (h *OrderHandler) VerifyPayment(c *gin.Context) {
	// 1. Extract Reference
	reference := c.Param("reference")
	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Transaction reference is required"})
		return
	}

	log.Info().Str("reference", reference).Msg("Received client request to verify payment")

	// Set a reasonable timeout for the external Paystack API call
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	// 2. Delegate Logic to Service (Verify, Check for Duplicates, Process)
	order, err := h.OrderService.VerifyAndProcess(ctx, reference)

	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Payment verification and processing failed")

		// Check for specific error types (if implemented in service)
		if errors.Is(err, utils.ErrOrderAlreadyProcessed) {
			c.JSON(http.StatusOK, gin.H{
				"status": "success",
				"message": "Order already processed successfully.",
				"data": order, // Return the existing order data
			})
			return
		}
		
		// General failure (e.g., Paystack status not successful, amount mismatch)
		c.JSON(http.StatusPaymentRequired, gin.H{
			"status": "failed",
			"message": "Payment verification failed or is pending. Please contact support.",
			"error": err.Error(),
		})
		return
	}

	// 3. Success Response (Order is new or was processed successfully)
	// We return 200 OK because the client is expecting a final status update.
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"message": "Payment verified and order created.",
		"data": order, // The final Order model, including generated tickets
	})
}

// -------------------------------------------------------------------
// 2. Paystack Webhook Handler (Server-to-Server POST)
// -------------------------------------------------------------------

// HandlePaystackWebhook receives and processes webhook notifications from Paystack.
// Endpoint: POST /api/webhooks/paystack
func (h *OrderHandler) HandlePaystackWebhook(c *gin.Context) {
	// 1. Webhook Security: Check Signature (Crucial for anti-spoofing)
	// NOTE: This usually requires access to the raw request body BEFORE Gin binds it.
	// We assume a middleware or utility function handles the raw body read and signature check.
	// For simplicity, we'll assume the security check is either handled by Gin middleware
	// or done inside the service layer, but it should ideally be checked here.
	// For now, we'll focus on the core flow:

	var webhookPayload models.PaystackWebhook // Define this struct in models package
	
	// 2. Decode Payload
	if err := c.ShouldBindJSON(&webhookPayload); err != nil {
		log.Error().Err(err).Msg("Failed to bind Paystack webhook payload")
		// Always return 200 to avoid Paystack retrying on a malformed request error
		c.JSON(http.StatusOK, gin.H{"status": "error", "message": "Could not parse payload"})
		return
	}

	// 3. Event Filtering
	if webhookPayload.Event != "charge.success" {
		log.Info().Str("event", webhookPayload.Event).Msg("Ignoring non-success Paystack event")
		// Acknowledge the webhook but do nothing
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Event type ignored"})
		return
	}

	// Set context for service layer timeout/cancellation
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	log.Info().Str("reference", webhookPayload.Data.Reference).Msg("Processing successful Paystack webhook")

	// 4. Delegate Logic to Service (Process Webhook Data, Handle Duplicates)
	err := h.OrderService.ProcessWebhook(ctx, &webhookPayload)

	// 5. Acknowledge Receipt
	if err != nil {
		log.Error().Err(err).Str("reference", webhookPayload.Data.Reference).Msg("Webhook processing failed in service layer")
		// Even on failure, return 200 OK unless it's a critical infrastructure failure
		// so Paystack stops retrying a business logic error.
		c.JSON(http.StatusOK, gin.H{"status": "error", "message": "Failed to process order/tickets internally"})
		return
	}
	
	// Success (or duplicate already handled)
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Webhook processed successfully"})
}