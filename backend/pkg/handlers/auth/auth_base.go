// backend/pkg/handlers/auth/auth_base.go

package auth

import (
	"net/http"
	"os"
	"time"

	"github.com/eventify/backend/pkg/middleware"
	serviceauth "github.com/eventify/backend/pkg/services/auth"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// AuthHandler now only needs the AuthService and maybe the JWT configuration
type AuthHandler struct {
	AuthService serviceauth.AuthService
}

// NewAuthHandler injects the service instead of the repos
func NewAuthHandler(authService serviceauth.AuthService) *AuthHandler {
	return &AuthHandler{
		AuthService: authService,
	}
}

// Cookie configuration constants
const (
	AccessTokenCookieName  = "access_token"
	RefreshTokenCookieName = "refresh_token"

	// Extended token durations for better UX
	AccessMaxAge  = 3600 * 24      // 24 hours (1 day)
	RefreshMaxAge = 3600 * 24 * 30 // 30 days

	// Absolute session timeout (30 days max, regardless of activity)
	AbsoluteSessionTimeout = 3600 * 24 * 30

	ResetTokenExpiry = 15 * time.Minute
)

// getCookieDomain returns the domain for cookies based on environment
func getCookieDomain() string {
	domain := os.Getenv("COOKIE_DOMAIN")
	if domain == "" || domain == "localhost" {
		return ""
	}
	return domain
}

// getCookieSameSite returns the SameSite policy for cookies
func getCookieSameSite() http.SameSite {
	sameSite := os.Getenv("COOKIE_SAMESITE")
	switch sameSite {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	case "lax":
		return http.SameSiteLaxMode
	default:
		return http.SameSiteLaxMode // Safe default
	}
}

// ✅ ENHANCED: setAuthCookies now also generates CSRF token on login
func setAuthCookies(c *gin.Context, accessToken, refreshToken string) {
	domain := getCookieDomain()
	secure := os.Getenv("COOKIE_SECURE") == "true"
	sameSite := getCookieSameSite()

	// SameSite=None requires Secure=true
	if sameSite == http.SameSiteNoneMode {
		secure = true
	}

	// Set Access Token Cookie (HttpOnly)
	c.SetSameSite(sameSite)
	c.SetCookie(
		AccessTokenCookieName,
		accessToken,
		AccessMaxAge,
		"/",
		domain,
		secure,
		true, // httpOnly
	)

	// Set Refresh Token Cookie (HttpOnly)
	c.SetSameSite(sameSite)
	c.SetCookie(
		RefreshTokenCookieName,
		refreshToken,
		RefreshMaxAge,
		"/",
		domain,
		secure,
		true, // httpOnly
	)

	// ✅ NEW: Generate CSRF token for authenticated session
	// This protects all subsequent state-changing requests
	csrfToken, err := middleware.GenerateAndSetCSRFToken(c)
	if err != nil {
		log.Error().Err(err).Msg("Auth: Failed to generate CSRF token")
		// Don't fail login if CSRF generation fails, just log it
	} else {
		log.Debug().
			Str("csrf_preview", csrfToken[:8]+"...").
			Msg("Auth: CSRF token generated for session")
	}
}

// clearAuthCookies removes authentication cookies
func clearAuthCookies(c *gin.Context) {
	domain := getCookieDomain()
	sameSite := getCookieSameSite()

	c.SetSameSite(sameSite)
	c.SetCookie(AccessTokenCookieName, "", -1, "/", domain, false, true)

	c.SetSameSite(sameSite)
	c.SetCookie(RefreshTokenCookieName, "", -1, "/", domain, false, true)

	// ✅ NEW: Also clear CSRF token on logout
	c.SetSameSite(sameSite)
	c.SetCookie(middleware.CSRFTokenCookieName, "", -1, "/", domain, false, false)

	log.Debug().Msg("Auth: All cookies cleared (auth + CSRF)")
}