package handlers

import (
	"context"
	"net/http"
	//"os"
	"time"

	"eventify/backend/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log" // For error logging
	"golang.org/x/crypto/bcrypt" // For password hashing
	"go.mongodb.org/mongo-driver/bson" // For MongoDB queries
	"go.mongodb.org/mongo-driver/mongo" // For MongoDB errors
	// Add your JWT package here (e.g., "github.com/dgrijalva/jwt-go" or similar)
	"eventify/backend/pkg/utils" // Placeholder for JWT utility functions
)

type AuthHandler struct {
	collection *mongo.Collection
}

func NewAuthHandler(db *mongo.Database) *AuthHandler {
	return &AuthHandler{
		collection: db.Collection("user"),
	}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var user models.User
	var ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// 1. Bind JSON to struct and validate input
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid input. Please check all fields.",
		})
		return
	}

	// 2. Check if user already exists
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
    
	// 3. Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password during signup")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server error: Failed to process password."})
		return
	}
	user.Password = string(hashedPassword) // Store the hash

	// 4. Save to MongoDB
	// Use the context for the insert operation
	_, insertErr := h.collection.InsertOne(ctx, user)
	
	if insertErr != nil {
		log.Error().Err(insertErr).Msg("Failed to insert new user into MongoDB")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create user account."})
		return
	}

	// 5. Success response (without returning the password hash)
	user.Password = "" // Clear the hash before sending the response
	
	c.JSON(http.StatusCreated, models.AuthResponse{ // Use 201 Created for better semantics
		Message: "Signup successful! Please log in.",
		// NOTE: Token generation is typically done on login, not signup
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var loginReq models.LoginRequest
	var user models.User // User struct to hold data retrieved from DB
	var ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	
	// 1. Bind JSON
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid email or password format.",
		})
		return
	}
	
	// 2. Find user by email
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
	
	// 3. Verify password
	// Compare the plaintext password with the stored hash
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password))
	
	if err != nil {
		// bcrypt returns an error on mismatch
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid email or password."})
		return
	}
	
	// 4. Generate JWT token
	// Assuming a helper function exists in pkg/utils (or similar)
	token, tokenErr := utils.GenerateJWT(user.ID.Hex()) 
	
	if tokenErr != nil {
		log.Error().Err(tokenErr).Msg("Failed to generate JWT token")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Authentication failed due to server error."})
		return
	}
	
	// 5. Success response
	user.Password = "" // Clear hash for response
	
	c.JSON(http.StatusOK, models.AuthResponse{
		Message: "Login successful!",
		Token: 	 token,
		User: 	 &user,
	})
}