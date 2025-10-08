// backend/pkg/handlers/auth.go
package handlers

import (
	"context"
	"net/http"
	"os"
	"time"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/utils"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	collection          *mongo.Collection
	refreshTokenService *models.RefreshTokenService
}

func NewAuthHandler(db *mongo.Database) *AuthHandler {
	return &AuthHandler{
		collection:          db.Collection("user"),
		refreshTokenService: models.NewRefreshTokenService(db),
	}
}

// Step 1: Cookie configuration constants
const (
	AccessTokenCookieName  = "access_token"
	RefreshTokenCookieName = "refresh_token"
	AccessMaxAge           = 60 * 15       // 15 minutes in seconds
	RefreshMaxAge          = 3600 * 24 * 7 // 7 days in seconds
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
	return os.Getenv("COOKIE_SECURE") == "true" // Should be true in production
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
		"/", // Changed from "/auth/refresh" to "/" for easier access
		domain,
		secure,
		true, // HttpOnly: CRITICAL for security
	)
}

// Step 5: Signup handler (unchanged, included for completeness)
func (h *AuthHandler) Signup(c *gin.Context) {
	var user models.User
	var ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Bind JSON to struct and validate input
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid input. Please check all fields.",
		})
		return
	}

	// Check if user already exists
	filter := bson.M{"email": user.Email}
	err := h.collection.FindOne(ctx, filter).Decode(&user)

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "User with this email already exists."})
		return
	} else if err != mongo.ErrNoDocuments {
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

	// Save to MongoDB
	_, insertErr := h.collection.InsertOne(ctx, user)

	if insertErr != nil {
		log.Error().Err(insertErr).Msg("Failed to insert new user into MongoDB")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create user account."})
		return
	}

	// Success response
	user.Password = ""

	c.JSON(http.StatusCreated, models.AuthResponse{
		Message: "Signup successful! Please log in.",
	})
}

// Step 6: Login handler with dual token generation
func (h *AuthHandler) Login(c *gin.Context) {
	var loginReq models.LoginRequest
	var user models.User
	var ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Bind JSON
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		log.Error().Err(err).Msg("Invalid login request body format")
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid email or password.",
		})
		return
	}

	// Find user by email
	filter := bson.M{"email": loginReq.Email}
	err := h.collection.FindOne(ctx, filter).Decode(&user)

	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid email or password."})
		return
	} else if err != nil {
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

	// NEW: Save the Refresh Token to the database
	saveErr := h.refreshTokenService.SaveRefreshToken(ctx, userID, refreshToken, RefreshMaxAge)
	if saveErr != nil {
		log.Error().Err(saveErr).Msg("Failed to save refresh token")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Authentication failed due to server error."})
		return
	}

	// Set both tokens in secure HTTP-ONLY cookies
	setAuthCookies(c, accessToken, refreshToken)

	// Success response
	user.Password = ""

	c.JSON(http.StatusOK, models.AuthResponse{
		Message: "Login successful! Tokens set in secure cookies.",
		User:    &user,
	})
}

// Step 7: NEW - Refresh Token handler
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Get the Refresh Token from the HTTP-Only cookie
	refreshToken, err := c.Cookie(RefreshTokenCookieName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "No refresh token provided."})
		return
	}

	// Validate the Refresh Token
	claims, err := utils.ValidateJWT(refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Session expired, please log in again."})
		return
	}

	// Verify Refresh Token against the database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	isValid, err := h.refreshTokenService.ValidateRefreshToken(ctx, claims.UserID, refreshToken)
	if err != nil || !isValid {
		log.Warn().Str("user_id", claims.UserID).Msg("Invalid or revoked refresh token")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Token revoked or invalid."})
		return
	}

	// Generate NEW Access Token
	newAccessToken, accessErr := utils.GenerateAccessJWT(claims.UserID)
	if accessErr != nil {
		log.Error().Err(accessErr).Msg("Failed to generate new access token")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Token generation failed."})
		return
	}

	// Set NEW Access Token cookie
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

	// Success response
	c.JSON(http.StatusOK, gin.H{"message": "Access token refreshed successfully."})
}

// Step 8: NEW - Get Current User handler (for session restoration)
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// This handler will be protected by AuthMiddleware
	// The middleware will set the user_id in the context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	// Fetch user from database
	var user models.User
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := h.collection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch user data")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch user data."})
		return
	}

	// Clear password before sending
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

// Step 9: Logout handler with token revocation
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get refresh token from cookie to revoke it
	refreshToken, err := c.Cookie(RefreshTokenCookieName)
	
	// NEW: Revoke the refresh token in the database
	if err == nil && refreshToken != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Extract user ID from token if possible
		if claims, validateErr := utils.ValidateJWT(refreshToken); validateErr == nil {
			revokeErr := h.refreshTokenService.RevokeRefreshToken(ctx, claims.UserID, refreshToken)
			if revokeErr != nil {
				log.Error().Err(revokeErr).Msg("Failed to revoke refresh token")
			}
		}
	}

	domain := getCookieDomain()
	secure := getCookieSecure()

	// Clear Access Token cookie
	c.SetCookie(AccessTokenCookieName, "", -1, "/", domain, secure, true)

	// Clear Refresh Token cookie
	c.SetCookie(RefreshTokenCookieName, "", -1, "/", domain, secure, true)

	log.Info().Msg("User logged out successfully (tokens cleared and revoked)")

	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful.",
	})
}