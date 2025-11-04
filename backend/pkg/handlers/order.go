// backend/pkg/handlers/order.go

package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

type OrderHandler struct {
	OrderService services.OrderService
}

func NewOrderHandler(orderService services.OrderService) *OrderHandler {
	return &OrderHandler{
		OrderService: orderService,
	}
}

// ============================================================================
// INITIALIZATION ENDPOINT
// ============================================================================

// InitializeOrder handles the creation of a PENDING order record.
// Endpoint: POST /api/orders/initialize
func (h *OrderHandler) InitializeOrder(c *gin.Context) {
	var req models.OrderInitializationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Warn().Err(err).Msg("Failed to bind initialization request JSON")
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"message": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// 🛠️ FIX: Removed 'req.AmountKobo' from log as it caused a compile error.
	// The amount is calculated and validated in the service layer.
	log.Info().
		Str("email", req.Email).
		Int("items_count", len(req.Items)).
		Str("ip", c.ClientIP()).
		Msg("📝 Order initialization request received")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Call service to validate and create PENDING order
	order, err := h.OrderService.InitializePendingOrder(ctx, &req)
	if err != nil {
		log.Error().
			Err(err).
			Str("email", req.Email).
			Msg("❌ Failed to initialize pending order")

		// Determine appropriate HTTP status
		status := http.StatusInternalServerError
		message := "Order processing failed"

		// Handle specific error types (Note: This is brittle, see discussion)
		errMsg := err.Error()
		if errMsg == "validation failed" ||
			errMsg == "amount verification failed" ||
			errMsg == "ticket stock insufficient" { // Added potential stock error
			status = http.StatusBadRequest
			message = "Invalid order data or item out of stock"
		}

		c.JSON(status, gin.H{
			"status": "error",
			"message": message,
			"details": err.Error(),
		})
		return
	}

	// Success - return reference to frontend
	log.Info().
		Str("reference", order.Reference).
		Str("order_id", order.ID.Hex()).
		Int("amount_kobo", order.AmountKobo).
		Msg("✅ Pending order created successfully")

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"message": "Order initialized successfully. Proceed to payment.",
		"data": gin.H{
			"reference": order.Reference,
			"amount_kobo": order.AmountKobo,
			"order_id": order.ID.Hex(),
		},
	})
}

// ============================================================================
// VERIFICATION ENDPOINT
// ============================================================================

// VerifyPayment handles client-initiated payment verification (backup to webhook)
// Endpoint: GET /api/payments/verify/:reference
func (h *OrderHandler) VerifyPayment(c *gin.Context) {
	reference := c.Param("reference")

	if reference == "" {
		log.Warn().Msg("⚠️ Verification request missing reference parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"message": "Transaction reference is required",
		})
		return
	}

	log.Info().
		Str("reference", reference).
		Str("client_ip", c.ClientIP()).
		Msg("🔍 Client verification request received")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	// Call service to verify with Paystack and process order transactionally
	order, err := h.OrderService.VerifyAndProcess(ctx, reference)
	if err != nil {
		log.Error().
			Err(err).
			Str("reference", reference).
			Msg("❌ Payment verification failed")

		// Determine response based on error type
		status := http.StatusPaymentRequired
		message := "Payment verification failed. Please contact support if you were charged."

		// Check for specific error types (Still brittle, see discussion)
		errorMsg := err.Error()
		if errorMsg == "order initialization record not found. Cannot verify payment securely" {
			status = http.StatusNotFound
			message = "Order not found. Please try payment again."
		} else if len(errorMsg) > 11 && errorMsg[:11] == "fraud alert" {
			status = http.StatusForbidden
			message = "Payment verification failed due to security check."
		} else if errorMsg == "transaction already processed successfully" {
			// Idempotent success (already handled by webhook, client just checking)
			status = http.StatusOK
			message = "Payment already successfully processed."
		}

		// If idempotency was detected, return 200 OK with the existing order status
		if status == http.StatusOK {
			c.JSON(http.StatusOK, gin.H{
				"status": "success",
				"message": message,
				"data": order, // Return the existing successful order
			})
			return
		}

		c.JSON(status, gin.H{
			"status": "failed",
			"message": message,
			"error": err.Error(),
		})
		return
	}

	// Success - return full order details
	log.Info().
		Str("reference", reference).
		Str("order_id", order.ID.Hex()).
		Str("status", order.Status).
		Msg("✅ Payment verification successful")

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"message": "Payment verified and order processed.",
		"data": order,
	})
}

// ============================================================================
// WEBHOOK ENDPOINT (PRIMARY PAYMENT PATH)
// ============================================================================

// HandlePaystackWebhook handles webhook notifications from Paystack
// Endpoint: POST /api/webhooks/paystack
func (h *OrderHandler) HandlePaystackWebhook(c *gin.Context) {
	// Read raw body for signature verification
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Error().Err(err).Msg("❌ Failed to read webhook body")
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"message": "Invalid request body",
		})
		return
	}

	// Get Paystack signature from header
	signature := c.GetHeader("x-paystack-signature")

	log.Info().
		Str("source_ip", c.ClientIP()).
		Bool("has_signature", signature != "").
		Int("body_size", len(bodyBytes)).
		Msg("📨 Webhook received from Paystack")

	// CRITICAL SECURITY CHECK: Verify webhook signature
	if !h.OrderService.VerifyWebhookSignature(bodyBytes, signature) {
		log.Error().
			Str("source_ip", c.ClientIP()).
			Msg("🚨 SECURITY ALERT: Invalid webhook signature")

		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"message": "Invalid signature",
		})
		return
	}

	// Parse webhook payload from bodyBytes
	var webhook models.PaystackWebhook
	if err := json.Unmarshal(bodyBytes, &webhook); err != nil {
		log.Error().Err(err).Msg("❌ Failed to parse webhook payload")
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"message": "Invalid webhook payload",
			"details": err.Error(),
		})
		return
	}

	// Validate webhook has required data
	if webhook.Data == nil || webhook.Data.Reference == "" {
		log.Error().Msg("❌ Webhook data or reference is missing")
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid webhook data structure"})
		return
	}

	// Filter for charge.success events only
	if webhook.Event != "charge.success" {
		log.Info().
			Str("event", webhook.Event).
			Str("reference", webhook.Data.Reference).
			Msg("⏭️ Ignoring non-charge.success webhook event")
		c.JSON(http.StatusOK, gin.H{"status": "ignored", "event": webhook.Event})
		return
	}

	log.Info().
		Str("event", webhook.Event).
		Str("reference", webhook.Data.Reference).
		Int("amount", webhook.Data.Amount).
		Str("channel", webhook.Data.Channel).
		Msg("🔄 Processing charge.success webhook")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	// Process webhook - this logic leverages the transactional and idempotent repo function
	if err := h.OrderService.ProcessWebhook(ctx, &webhook, signature); err != nil {
		log.Error().
			Err(err).
			Str("reference", webhook.Data.Reference).
			Msg("❌ Webhook processing failed")

		// IMPORTANT: Return 200 OK to prevent Paystack retries, 
		// we log the error but acknowledge receipt.
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"message": "Webhook received but processing failed",
			"details": err.Error(),
		})
		return
	}

	log.Info().
		Str("reference", webhook.Data.Reference).
		Msg("✅ Webhook processed successfully (either finalized or idempotent success)")

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"message": "Webhook processed successfully",
	})
}

// ============================================================================
// UTILITY ENDPOINTS (Optional - for admin/debugging)
// ============================================================================

// GetOrderByReference retrieves order details by reference.
// This endpoint requires authentication middleware to attach the userID to the context.
// Endpoint: GET /api/orders/:reference
func (h *OrderHandler) GetOrderByReference(c *gin.Context) {
	reference := c.Param("reference")

	if reference == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"message": "Reference is required",
		})
		return
	}

	// 1. Extract the UserID from the Gin Context
	userIDVal, exists := c.Get("userID")
	if !exists {
		// This should theoretically be caught by the authentication middleware, 
		// but it's a good fail-safe.
		log.Error().Msg("UserID not found in context, middleware failure?")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"message": "Authorization context is missing.",
		})
		return
	}
	userID, ok := userIDVal.(string)
	if !ok {
		log.Error().Msg("UserID in context is not a string.")
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Internal context error."})
		return
	}

	// 2. Pass the UserID to the service for Authorization Check
	// The service will check if the user is an admin OR the order owner.
	order, err := h.OrderService.GetOrderByReference(c.Request.Context(), reference, userID)

	if err != nil {
		log.Error().Err(err).Str("reference", reference).Msg("Failed to retrieve order")
		// Assume any retrieval failure not covered by not found is an internal error
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"message": "Failed to retrieve order details",
		})
		return
	}

	if order == nil {
		// If the user is not the owner or admin, the service should return nil/error
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"message": "Order not found or access denied",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": order,
	})
}
