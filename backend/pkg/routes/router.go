//backend/ pkg/ routes/router.go


package routes

import (
	"net/http"
	//"os"
	"time"

	"eventify/backend/pkg/handlers"
	"eventify/backend/pkg/middleware"

	"github.com/gin-contrib/cors"
	ginzerolog "github.com/gin-contrib/logger"
	"github.com/gin-gonic/gin"
)


// ConfigureRouter sets up all application routes and middleware.
func ConfigureRouter(authHandler *handlers.AuthHandler) *gin.Engine {
	router := gin.New()

	// Global Middleware
	router.Use(gin.Recovery())
	router.Use(ginzerolog.SetLogger())

	// CORS Configuration (Step 11 from main.go)
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Basic Health Check Route (Step 12 from main.go)
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Eventify API is running",
			"status":  "healthy",
		})
	})

	// Public Auth Routes (Step 13 from main.go)
	auth := router.Group("/auth")
	{
		auth.POST("/signup", authHandler.Signup)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
		auth.GET("/me", middleware.AuthMiddleware(), authHandler.GetCurrentUser)
	}

	// Protected Routes (Step 14 from main.go)
	protected := router.Group("/")
	// Assuming you renamed the middleware file to jwt_auth.go or similar, the reference here should match.
	protected.Use(middleware.AuthMiddleware()) // Use the middleware package reference
	{
		// protected.GET("/auth/me", authHandler.GetCurrentUser)
		// protected.GET("/events", eventHandler.GetEvents)
	}

	return router
}