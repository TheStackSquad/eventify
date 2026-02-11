// backend/pkg/handlers/auth/auth_session.go

package auth

import (
	"net/http"
	"time"

	"github.com/eventify/backend/pkg/models"
	serviceauth "github.com/eventify/backend/pkg/services/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// Login handles user authentication with device metadata capture
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request."})
		return
	}

	// 1. Capture Metadata
	ip := c.ClientIP()
	ua := c.Request.UserAgent()

	// 2. Service Call
	user, tokens, err := h.AuthService.Login(c.Request.Context(), req.Email, req.Password, ip, ua)

	if err != nil {
		switch err {
		case serviceauth.ErrAccountLocked:
			c.JSON(http.StatusForbidden, gin.H{"message": "Account temporarily locked."})
		case serviceauth.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid email or password."})
		default:
			log.Error().Err(err).Msg("Auth: Unexpected error during login")
			c.JSON(http.StatusInternalServerError, gin.H{"message": "An internal error occurred."})
		}
		return
	}

	// 3. Set Persistence (now includes CSRF token generation)
	setAuthCookies(c, tokens.AccessToken, tokens.RefreshToken)

	// 4. Response
	log.Info().
		Str("user_id", user.ID.String()).
		Str("ip", ip).
		Str("user_agent", ua).
		Msg("Auth: Login successful")

	c.JSON(http.StatusOK, models.AuthResponse{
		Message: "Welcome back!",
		User:    user,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	oldRefreshToken, err := c.Cookie(RefreshTokenCookieName)
	if err != nil || oldRefreshToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "No active session."})
		return
	}

	// 1. GATHER CURRENT METADATA
	currentIP := c.ClientIP()
	currentUA := c.Request.UserAgent()

	// 2. ATTEMPT REFRESH (now returns userID for enriched response)
	userID, tokens, err := h.AuthService.RefreshToken(
		c.Request.Context(),
		oldRefreshToken,
		time.Duration(AbsoluteSessionTimeout)*time.Second,
		currentIP,
		currentUA,
	)

	if err != nil {
		log.Debug().Err(err).Msg("Auth: Refresh process interrupted")

		switch err {
		case serviceauth.ErrSessionExpired:
			clearAuthCookies(c)
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "SESSION_EXPIRED",
				"message": "Your session has expired. Please log in again.",
			})

		case serviceauth.ErrTokenReused:
			clearAuthCookies(c)
			log.Warn().
				Str("ip", currentIP).
				Str("user_agent", currentUA).
				Msg("🚨 Security Alert: Token reuse attempt")
			
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "SECURITY_VIOLATION",
				"message": "Security alert: Multiple session access detected. Please log in again.",
			})

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Temporary authentication failure. Please try again.",
			})
		}
		return
	}

	// ✅ NEW: Log successful refresh with metadata for security monitoring
	log.Info().
		Str("user_id", userID.String()).
		Str("ip", currentIP).
		Str("user_agent_preview", currentUA[:min(50, len(currentUA))]).
		Msg("Auth: Token refresh successful")

	// 3. Set new cookies (CSRF token already exists, no need to regenerate)
	setAuthCookies(c, tokens.AccessToken, tokens.RefreshToken)

	c.JSON(http.StatusOK, gin.H{"message": "Session refreshed."})
}

// Logout handles user session termination
func (h *AuthHandler) Logout(c *gin.Context) {
	// 1. Clear cookies IMMEDIATELY to protect the client
	clearAuthCookies(c)

	var userID uuid.UUID
	if val, exists := c.Get("user_id"); exists {
		if id, ok := val.(uuid.UUID); ok {
			userID = id
		}
	}

	// 2. Extract tokens from cookies
	refreshToken, _ := c.Cookie(RefreshTokenCookieName)
	accessToken, _ := c.Cookie(AccessTokenCookieName)

	// 3. Delegate ALL revocation logic to the service
	if userID != uuid.Nil {
		err := h.AuthService.Logout(c.Request.Context(), userID, refreshToken, accessToken)
		if err != nil {
			log.Error().Err(err).Msg("Auth: Logout service reported an error")
		}
	}

	// ✅ NEW: Log logout with metadata
	log.Info().
		Str("user_id", userID.String()[:8]).
		Str("ip", c.ClientIP()).
		Bool("has_refresh", refreshToken != "").
		Bool("has_access", accessToken != "").
		Msg("Auth: Logout successful")

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully."})
}

// ✅ Helper function for safe string truncation
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}