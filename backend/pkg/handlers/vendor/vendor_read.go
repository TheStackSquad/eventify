// backend/pkg/handlers/vendor/vendor_read.go
// Vendor handler - read operations

package handlers

import (
	"net/http"
	"context"
	"time"  

	"github.com/gin-gonic/gin"
	"github.com/eventify/backend/pkg/models"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

func (h *VendorHandler) ListVendors(c *gin.Context) {
    queryParams := c.Request.URL.Query()
    filters := make(map[string]interface{})

    for key, values := range queryParams {
        if len(values) > 0 && values[0] != "" { // Added empty string check
            filters[key] = values[0]
        }
    }

    vendors, err := h.VendorService.GetVendors(c.Request.Context(), filters)
    if err != nil {
        log.Error().Err(err).Msg("Failed to retrieve vendors list")
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve vendors list."})
        return
    }

    // ✅ Ensure vendors is never nil so JSON is [] not null
    if vendors == nil {
        vendors = []models.Vendor{} // Initialize as empty slice
    }

    // ✅ Wrap in an object to match frontend expectations
    c.JSON(http.StatusOK, gin.H{
        "vendors":    vendors,
        "pagination": gin.H{"totalCount": len(vendors)}, 
    })
}

func (h *VendorHandler) GetVendorProfile(c *gin.Context) {
	vendorID := c.Param("id")

	if _, err := uuid.Parse(vendorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID format."})
		return
	}

	vendor, err := h.VendorService.GetVendorByID(c.Request.Context(), vendorID)
	if err != nil {
		log.Error().Err(err).Str("vendorID", vendorID).Msg("Vendor not found")
		if err.Error() == "vendor not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vendor profile not found."})
			return
		}
		if err.Error() == "invalid vendor ID format" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID format."})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve vendor profile."})
		return
	}

	c.JSON(http.StatusOK, vendor)
}

// TrackProfileView middleware records vendor profile views
func (h *VendorHandler) TrackProfileView(c *gin.Context) {
	vendorID := c.Param("id")
	
	parsedID, err := uuid.Parse(vendorID)
	if err != nil {
		c.Next() // Continue to handler even if tracking fails
		return
	}
	
	// Extract viewer info
	var viewerID *uuid.UUID
	if uid, exists := c.Get("user_id"); exists {
		if parsed, ok := uid.(uuid.UUID); ok {
			viewerID = &parsed
		}
	}
	
	// Generate session ID from client fingerprint
	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		// Fallback: IP + Date-based session
		sessionID = c.ClientIP() + "-" + time.Now().Format("20060102")
	}
	
	// Track asynchronously to not block response
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		
		recorded, err := h.StatsRepo.RecordProfileView(
			ctx,
			parsedID,
			viewerID,
			c.ClientIP(),
			sessionID,
			c.Request.UserAgent(),
		)
		
		if err != nil {
			log.Warn().Err(err).Str("vendor_id", vendorID).Msg("Profile view tracking failed")
		} else if recorded {
			log.Debug().Str("vendor_id", vendorID).Msg("Profile view recorded")
		}
	}()
	
	c.Next()
}