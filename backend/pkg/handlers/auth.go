package handlers

import (
	"net/http"

	"eventify/backend/pkg/models"
	
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

type AuthHandler struct {
	collection *mongo.Collection
}

func NewAuthHandler(db *mongo.Database) *AuthHandler {
	return &AuthHandler{
		collection: db.Collection("users"),
	}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var user models.User
	
	// Gin automatically binds JSON to struct
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid input: " + err.Error(),
		})
		return
	}
	
	// TODO: Add password hashing
	// TODO: Check if user already exists
	// TODO: Save to MongoDB
	
	// Success response (matches your frontend expectation)
	c.JSON(http.StatusOK, models.AuthResponse{
		Message: "Signup successful! Redirecting to login.",
		User:    &user,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var loginReq models.LoginRequest // Fixed: loginReq declared properly
	
	// Fixed: Should bind to loginReq, not user
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid email or password",
		})
		return
	}
	
	// TODO: Find user by email using loginReq.Email
	// TODO: Verify password using loginReq.Password  
	// TODO: Generate JWT token
	
	c.JSON(http.StatusOK, models.AuthResponse{
		Message: "Login successful!",
		Token:   "jwt-token-here", // TODO: Implement JWT
	})
}