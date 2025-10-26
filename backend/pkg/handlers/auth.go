// backend/pkg/handlers/auth.go
package handlers

import (
	"context"
	"net/http"
	"os"
	"time"
	"crypto/rand"
	"encoding/hex"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/utils"
	"eventify/backend/pkg/repository" // <-- Import the repository package

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	//"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	//"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	// FIX: Use the AuthRepository interface for all user CRUD/role operations
	AuthRepo            repository.AuthRepository 
	refreshTokenService *models.RefreshTokenService
	// Note: We keep the collection for direct use in Signup/Login for simplicity,
	// but best practice dictates all user-related DB access should go through AuthRepo.
	// We'll update to use AuthRepo where possible.
}

// FIX: NewAuthHandler now accepts the repository.AuthRepository interface.
func NewAuthHandler(authRepo repository.AuthRepository, db *mongo.Database) *AuthHandler {
	return &AuthHandler{
		AuthRepo: authRepo, // <-- Dependency Injected
		// The RefreshTokenService still takes the raw DB object, which is assumed correct for now.
		refreshTokenService: models.NewRefreshTokenService(db),
	}
}

// Step 1: Cookie configuration constants
const (
	AccessTokenCookieName  = "access_token"
	RefreshTokenCookieName = "refresh_token"
	AccessMaxAge           = 60 * 15
	RefreshMaxAge          = 3600 * 24 * 7
)

// Step 2: Get cookie domain from environment or use default
func getCookieDomain() string {
	domain := os.Getenv("COOKIE_DOMAIN")
	if domain == "" {
		return "localhost" // Default for development
	}
	return domain
}

// Step 3: Get cookie secure flag from environment
func getCookieSecure() bool {
	return os.Getenv("COOKIE_SECURE") == "true"
}

// Step 4: Helper function to set both auth cookies
func setAuthCookies(c *gin.Context, accessToken, refreshToken string) {
	domain := getCookieDomain()
	secure := getCookieSecure()

	// Access Token (Short-lived, for API calls)
	c.SetCookie(
		AccessTokenCookieName,
		accessToken,
		AccessMaxAge,
		"/",
		domain,
		secure,
		true, // HttpOnly: CRITICAL for security
	)

	// Refresh Token (Long-lived, for renewal only)
	c.SetCookie(
		RefreshTokenCookieName,
		refreshToken,
		RefreshMaxAge,
		"/",
		domain,
		secure,
		true, // HttpOnly: CRITICAL for security
	)
}

// Step 5: Signup handler
func (h *AuthHandler) Signup(c *gin.Context) {
	var user models.User
	var ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := c.ShouldBindJSON(&user); err != nil {
		// Log the exact binding error from Gin. This is the key to fixing the 400.
        log.Error().Err(err).Msg("Signup request body binding failed (400 Bad Request)")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid input. Please check all fields.",
		})
		return
	}

	// Log only the non-sensitive fields (like Email and Name)
    log.Info().Str("email", user.Email).Str("name", user.Name).Msg("Received valid signup request body.")

	// FIX: Use AuthRepo to check if user already exists
	_, err := h.AuthRepo.GetUserByEmail(ctx, user.Email)

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "User with this email already exists."})
		return
	} 
	// The repository now returns errors.New("user not found") instead of mongo.ErrNoDocuments
	if err.Error() != "user not found" && err.Error() != "user with this email already exists" { 
		log.Error().Err(err).Msg("Database error during user check (Signup)")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server error. Please try again."})
		return
	}
	
	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password during signup")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server error: Failed to process password."})
		return
	}
	user.Password = string(hashedPassword)
	
	// FIX: Use AuthRepo to save to MongoDB
	_, insertErr := h.AuthRepo.CreateUser(ctx, &user)

	if insertErr != nil {
		log.Error().Err(insertErr).Msg("Failed to insert new user into MongoDB")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create user account."})
		return
	}

	// Success response
	c.JSON(http.StatusCreated, models.AuthResponse{
		Message: "Signup successful! Please log in.",
	})
}

// Step 6: Login handler with dual token generation
func (h *AuthHandler) Login(c *gin.Context) {
	var loginReq models.LoginRequest
	var ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := c.ShouldBindJSON(&loginReq); err != nil {
		log.Error().Err(err).Msg("Invalid login request body format (400 Bad Request)")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid email or password.",
		})
		return
	}

	// FIX: Use AuthRepo to find user by email
	user, err := h.AuthRepo.GetUserByEmail(ctx, loginReq.Email)

	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid email or password."})
			return
		}
		log.Error().Err(err).Msg("Database error during user lookup (Login)")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server error during authentication."})
		return
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password))

	if err != nil {
		log.Warn().Str("email", loginReq.Email).Msg("Password verification failed for user")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid email or password."})
		return
	}

	// Generate Access and Refresh Tokens
	userID := user.ID.Hex()

	accessToken, accessErr := utils.GenerateAccessJWT(userID)
	refreshToken, refreshErr := utils.GenerateRefreshJWT(userID)

	if accessErr != nil || refreshErr != nil {
		log.Error().Err(accessErr).Err(refreshErr).Msg("Failed to generate tokens")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Authentication failed due to server error."})
		return
	}

	// Save the Refresh Token to the database
	saveErr := h.refreshTokenService.SaveRefreshToken(ctx, userID, refreshToken, RefreshMaxAge)
	if saveErr != nil {
		log.Error().Err(saveErr).Msg("Failed to save refresh token")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Authentication failed due to server error."})
		return
	}

	// Set both tokens in secure HTTP-ONLY cookies
	setAuthCookies(c, accessToken, refreshToken)

	// Use the ToUserProfile method to convert *models.User to *models.UserProfile
	userProfile := user.ToUserProfile()

	// Success response
	c.JSON(http.StatusOK, models.AuthResponse{
		Message: "Login successful! Tokens set in secure cookies.",
		User:    userProfile,
	})
}

// Step 7: Refresh Token handler 
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// --- LOGGING STEP 1: Check for the Refresh Token cookie ---
	refreshToken, err := c.Cookie(RefreshTokenCookieName)
	if err != nil {
		// Log the failure to find the cookie
		log.Warn().Err(err).Msg("Refresh token cookie not found on request.")
		
        // Note: For debugging, you can also log the headers to ensure 'Cookie' is present:
        // log.Debug().Interface("headers", c.Request.Header).Msg("Request headers for 401")

		c.JSON(http.StatusUnauthorized, gin.H{"message": "No refresh token provided."})
		return
	}

	// --- LOGGING STEP 2: Validate JWT structure and expiration ---
	claims, err := utils.ValidateJWT(refreshToken)
	if err != nil {
		// Log the validation failure (e.g., token expired or malformed)
		log.Warn().Err(err).Msg("Refresh token failed JWT validation.")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Session expired, please log in again."})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// --- LOGGING STEP 3: Validate token against the database/revocation list ---
	isValid, err := h.refreshTokenService.ValidateRefreshToken(ctx, claims.UserID, refreshToken)
	if err != nil {
		// Log database or service error
		log.Error().Err(err).Str("user_id", claims.UserID).Msg("Database error during refresh token validation.")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Token revoked or invalid."}) // Returning 401 for simplicity
		return
	}
    if !isValid {
        // Log the reason for invalidity (e.g., token was revoked or not found in DB)
        log.Warn().Str("user_id", claims.UserID).Msg("Refresh token is invalid or revoked per database check.")
        c.JSON(http.StatusUnauthorized, gin.H{"message": "Token revoked or invalid."})
        return
    }
    
    // --- LOGGING STEP 4: Success, token generation begins ---
    log.Info().Str("user_id", claims.UserID).Msg("Refresh token successfully validated. Generating new access token.")

	newAccessToken, accessErr := utils.GenerateAccessJWT(claims.UserID)
	if accessErr != nil {
		log.Error().Err(accessErr).Msg("Failed to generate new access token")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Token generation failed."})
		return
	}

	// Set the new Access Token cookie (no logging needed here unless the cookie setting fails, which is rare)
	c.SetCookie(
		AccessTokenCookieName,
		newAccessToken,
		AccessMaxAge,
		"/",
		getCookieDomain(),
		getCookieSecure(),
		true,
	)

	// --- LOGGING STEP 5: Success response ---
	log.Info().Str("user_id", claims.UserID).Msg("Access token refreshed and cookie set successfully.")

	c.JSON(http.StatusOK, gin.H{"message": "Access token refreshed successfully."})
}

// Step 8: Get Current User handler (for session restoration)
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userIDHex, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	
	// FIX: Use AuthRepo to fetch user by ID
	user, err := h.AuthRepo.GetUserByID(c.Request.Context(), userIDHex.(string))
	
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{"message": "User not found."})
			return
		}
		log.Error().Err(err).Msg("Failed to fetch user data")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch user data."})
		return
	}

	// Use the ToUserProfile method to send the DTO instead of the full model
	userProfile := user.ToUserProfile()

	c.JSON(http.StatusOK, gin.H{
		"user": userProfile,
	})
}

const ResetTokenExpiry = 15 * time.Minute // 15 minutes validity

// generateResetToken creates a secure random token
func generateResetToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// ForgotPassword handles password reset requests
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error().Err(err).Msg("Invalid forgot password request body")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid email address.",
		})
		return
	}
	
	// Check if user exists
	user, err := h.AuthRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// SECURITY: Don't reveal if email exists or not
		log.Warn().Str("email", req.Email).Msg("Password reset requested for non-existent email")
		c.JSON(http.StatusOK, models.PasswordResetResponse{
			Message: "If that email exists, a reset link has been sent.",
		})
		return
	}
	
	// Generate reset token
	token, err := generateResetToken()
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate reset token")
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to process password reset request.",
		})
		return
	}
	
	// Save token with expiry
	expiry := time.Now().Add(ResetTokenExpiry)
	err = h.AuthRepo.SavePasswordResetToken(ctx, req.Email, token, expiry)
	if err != nil {
		log.Error().Err(err).Msg("Failed to save reset token")
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to process password reset request.",
		})
		return
	}
	
	// TODO: Send email with reset link
	// For now, we'll log it (REMOVE IN PRODUCTION!)
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	resetLink := frontendURL + "/reset-password/" + token
	
	log.Info().
		Str("email", user.Email).
		Str("reset_link", resetLink).
		Msg("🔗 PASSWORD RESET LINK (Send via email in production)")
	
	// TODO: Implement email sending
	// err = sendPasswordResetEmail(user.Email, user.Name, resetLink)
	// if err != nil {
	//     log.Error().Err(err).Msg("Failed to send reset email")
	//     c.JSON(http.StatusInternalServerError, gin.H{
	//         "message": "Failed to send reset email.",
	//     })
	//     return
	// }
	
	c.JSON(http.StatusOK, models.PasswordResetResponse{
		Message: "If that email exists, a reset link has been sent. Please check your inbox.",
	})
}

// VerifyResetToken validates a reset token
func (h *AuthHandler) VerifyResetToken(c *gin.Context) {
	token := c.Query("token")
	
	if token == "" {
		c.JSON(http.StatusBadRequest, models.PasswordResetResponse{
			Message: "Reset token is required.",
			Valid:   false,
		})
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	// Check if token exists and is valid
	_, err := h.AuthRepo.GetUserByResetToken(ctx, token)
	if err != nil {
		log.Warn().Str("token", token).Msg("Invalid or expired reset token")
		c.JSON(http.StatusUnauthorized, models.PasswordResetResponse{
			Message: "Invalid or expired reset token.",
			Valid:   false,
		})
		return
	}
	
	c.JSON(http.StatusOK, models.PasswordResetResponse{
		Message: "Reset token is valid.",
		Valid:   true,
	})
}

// ResetPassword handles password reset with token
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error().Err(err).Msg("Invalid reset password request body")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request. Token and new password are required.",
		})
		return
	}
	
	// Verify token and get user
	user, err := h.AuthRepo.GetUserByResetToken(ctx, req.Token)
	if err != nil {
		log.Warn().Str("token", req.Token).Msg("Invalid or expired reset token")
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid or expired reset token.",
		})
		return
	}
	
	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(req.NewPassword), 
		bcrypt.DefaultCost,
	)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash new password")
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to reset password.",
		})
		return
	}
	
	// Update password
	err = h.AuthRepo.UpdatePassword(ctx, user.ID, string(hashedPassword))
	if err != nil {
		log.Error().Err(err).Msg("Failed to update password")
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to reset password.",
		})
		return
	}
	
	// Clear reset token
	err = h.AuthRepo.ClearPasswordResetToken(ctx, user.ID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to clear reset token")
		// Don't fail the request, password was already changed
	}
	
	log.Info().
		Str("user_id", user.ID.Hex()).
		Str("email", user.Email).
		Msg("✅ Password reset successful")
	
	c.JSON(http.StatusOK, models.PasswordResetResponse{
		Message: "Password reset successful! You can now log in with your new password.",
	})
}

// Step 9: Logout handler with token revocation
func (h *AuthHandler) Logout(c *gin.Context) {
	// ... (Logout logic remains the same)
	refreshToken, err := c.Cookie(RefreshTokenCookieName)
	
	// Revoke the refresh token in the database
	if err == nil && refreshToken != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if claims, validateErr := utils.ValidateJWT(refreshToken); validateErr == nil {
			revokeErr := h.refreshTokenService.RevokeRefreshToken(ctx, claims.UserID, refreshToken)
			if revokeErr != nil {
				log.Error().Err(revokeErr).Msg("Failed to revoke refresh token")
			}
		}
	}

	domain := getCookieDomain()
	secure := getCookieSecure()

	c.SetCookie(AccessTokenCookieName, "", -1, "/", domain, secure, true)
	c.SetCookie(RefreshTokenCookieName, "", -1, "/", domain, secure, true)

	log.Info().Msg("User logged out successfully (tokens cleared and revoked)")

	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful.",
	})
}