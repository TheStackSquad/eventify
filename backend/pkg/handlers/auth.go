// backend/pkg/handlers/auth.go
package handlers

import (
	"context"
	"net/http"
	"os"
	"time"

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
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid input. Please check all fields.",
		})
		return
	}

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
		log.Error().Err(err).Msg("Invalid login request body format")
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

// Step 7: Refresh Token handler (No changes needed, as it doesn't return user data)
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// ... (Refresh token logic remains the same)
	refreshToken, err := c.Cookie(RefreshTokenCookieName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "No refresh token provided."})
		return
	}

	claims, err := utils.ValidateJWT(refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Session expired, please log in again."})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	isValid, err := h.refreshTokenService.ValidateRefreshToken(ctx, claims.UserID, refreshToken)
	if err != nil || !isValid {
		log.Warn().Str("user_id", claims.UserID).Msg("Invalid or revoked refresh token")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Token revoked or invalid."})
		return
	}

	newAccessToken, accessErr := utils.GenerateAccessJWT(claims.UserID)
	if accessErr != nil {
		log.Error().Err(accessErr).Msg("Failed to generate new access token")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Token generation failed."})
		return
	}

	c.SetCookie(
		AccessTokenCookieName,
		newAccessToken,
		AccessMaxAge,
		"/",
		getCookieDomain(),
		getCookieSecure(),
		true,
	)

	log.Info().Str("user_id", claims.UserID).Msg("Access token refreshed successfully")

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