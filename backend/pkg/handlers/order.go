//backend/pkg/handlers/order.go
package handlers

import (
	"context"
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

// InitializeOrder handles the creation of a PENDING order record in the database.
// Endpoint: POST /api/orders/initialize
// This is the CRITICAL first step for the secure payment flow.
func (h *OrderHandler) InitializeOrder(c *gin.Context) {
	var req models.OrderInitializationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Warn().Err(err).Msg("Failed to bind initialization request JSON")
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request format",
		})
		return
	}

	log.Info().
		Str("email", req.Email).
		Int("amount", req.AmountInKobo).
		Msg("Order initialization request received")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// 1. Call the service to validate, create the PENDING order, and generate the secure reference.
	// NOTE: Renamed 'dbReference' to 'order' for clarity, assuming service returns *models.Order
	order, err := h.OrderService.InitializePendingOrder(ctx, &req) 

	if err != nil {
		log.Error().
			Err(err).
			Str("email", req.Email).
			Msg("Failed to initialize pending order")

		// Use http.StatusConflict (409) for potential business logic errors like stock issues
		status := http.StatusInternalServerError 
		if err.Error() == "stock error" { // Placeholder for a real stock error check
		    status = http.StatusConflict
		}
		
		c.JSON(status, gin.H{
			"status":  "error",
			"message": "Order processing failed: " + err.Error(),
		})
		return
	}

	// 2. Success: Return the server-generated reference to the client.
	// FIX: Access the string field 'Reference' from the returned order object.
	log.Info().
		Str("reference", order.Reference).
		Msg("Pending order created successfully")

	// This JSON structure exactly matches the frontend's expectation: result.data.reference
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Order initialized successfully. Proceed to payment.",
		"data": gin.H{
			"reference": order.Reference, // FIX: Access the string field 'Reference'
		},
	})
}

// VerifyPayment handles client-initiated payment verification
// Endpoint: GET /api/payments/verify/:reference
func (h *OrderHandler) VerifyPayment(c *gin.Context) {
	reference := c.Param("reference")
	if reference == "" {
		log.Warn().Msg("Verification request missing reference parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Transaction reference is required",
		})
		return
	}

	log.Info().
		Str("reference", reference).
		Str("client_ip", c.ClientIP()).
		Msg("Client verification request received")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	order, err := h.OrderService.VerifyAndProcess(ctx, reference)

	if err != nil {
		log.Error().
			Err(err).
			Str("reference", reference).
			Msg("Payment verification failed")

		c.JSON(http.StatusPaymentRequired, gin.H{
			"status":  "failed",
			"message": "Payment verification failed. Please contact support if you were charged.",
			"error":   err.Error(),
		})
		return
	}

	// Success - order either newly created or already existed
	log.Info().
		Str("reference", reference).
		Str("order_id", order.ID.Hex()).
		Str("status", order.Status).
		Msg("Payment verification successful")

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Payment verified and order processed.",
		"data":    order,
	})
}

// HandlePaystackWebhook handles webhook notifications from Paystack
// Endpoint: POST /api/webhooks/paystack
func (h *OrderHandler) HandlePaystackWebhook(c *gin.Context) {
	log.Info().
		Str("source_ip", c.ClientIP()).
		Msg("Webhook received from Paystack")

	var webhook models.PaystackWebhook
	if err := c.ShouldBindJSON(&webhook); err != nil {
		log.Error().Err(err).Msg("Failed to parse webhook payload")
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid webhook payload",
		})
		return
	}

	// Filter for charge.success events only
	if webhook.Event != "charge.success" {
		log.Info().
			Str("event", webhook.Event).
			Msg("Ignoring non-charge.success webhook event")
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}

	log.Info().
		Str("event", webhook.Event).
		Str("reference", webhook.Data.Reference).
		Int("amount", webhook.Data.Amount).
		Msg("Processing charge.success webhook")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	if err := h.OrderService.ProcessWebhook(ctx, &webhook); err != nil {
		log.Error().
			Err(err).
			Str("reference", webhook.Data.Reference).
			Msg("Webhook processing failed")

		// Return 200 to prevent Paystack retries for business logic errors
		c.JSON(http.StatusOK, gin.H{
			"status":  "error",
			"message": "Webhook received but processing failed",
		})
		return
	}

	log.Info().
		Str("reference", webhook.Data.Reference).
		Msg("Webhook processed successfully")

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Webhook processed successfully",
	})
}
