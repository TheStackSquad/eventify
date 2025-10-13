// backend/pkg/routes/router.go
package routes

import (
	"net/http"
	"time"

	"eventify/backend/pkg/handlers"
	"eventify/backend/pkg/middleware"
	"eventify/backend/pkg/repository"

	"github.com/gin-contrib/cors"
	ginzerolog "github.com/gin-contrib/logger"
	"github.com/gin-gonic/gin"
)

// ConfigureRouter sets up all application routes and middleware.
// FIX: Added the authRepo dependency required by the AdminMiddleware.
func ConfigureRouter(
	authHandler *handlers.AuthHandler,
	eventHandler *handlers.EventHandler,
	vendorHandler *handlers.VendorHandler,
	authRepo repository.AuthRepository, // <--- FIX: Added Dependency Injection
) *gin.Engine {
	router := gin.New()

	// Global Middleware
	router.Use(gin.Recovery())
	router.Use(ginzerolog.SetLogger())

	// CORS Configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Basic Health Check Route
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Eventify API is running",
			"status":  "healthy",
		})
	})

	// -------------------------------------------------------------------
	// 1. PUBLIC ROUTES (Authentication)
	// -------------------------------------------------------------------
	auth := router.Group("/auth")
	{
		auth.POST("/signup", authHandler.Signup)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	// -------------------------------------------------------------------
	// 2. PUBLIC VENDOR LISTING ROUTES (No Auth Required)
	// -------------------------------------------------------------------
	vendorPublic := router.Group("/api/v1/vendors")
	{
		vendorPublic.GET("/", vendorHandler.ListVendors)
		vendorPublic.GET("/:id", vendorHandler.GetVendorProfile)
		vendorPublic.POST("/register", vendorHandler.RegisterVendor)
	}

	// -------------------------------------------------------------------
	// 3. PROTECTED ROUTES (Requiring AuthMiddleware)
	// -------------------------------------------------------------------

	// Protected Auth Routes (e.g., fetching current user)
	protectedAuth := router.Group("/auth")
	protectedAuth.Use(middleware.AuthMiddleware())
	{
		protectedAuth.GET("/me", authHandler.GetCurrentUser)
	}

	// Protected Event Routes
	events := router.Group("/events")
	events.Use(middleware.AuthMiddleware())
	{
		events.POST("/create", eventHandler.CreateEvent)
		events.GET("/my-events", eventHandler.GetUserEventsHandler)
		events.GET("/:eventId", eventHandler.GetEventByID)
		events.PUT("/:eventId", eventHandler.UpdateEvent)
		events.DELETE("/:eventId", eventHandler.DeleteEvent)
		events.GET("/:eventId/analytics", eventHandler.FetchEventAnalytics)
	}

	// -------------------------------------------------------------------
	// 4. ADMIN VENDOR VERIFICATION ROUTES (Requires Admin Auth Middleware)
	// -------------------------------------------------------------------
	adminVendor := router.Group("/api/v1/admin/vendors")

	// FIX: The AdminMiddleware function is now called with the required dependency.
	adminVendor.Use(middleware.AuthMiddleware(), middleware.AdminMiddleware(authRepo))
	{
		adminVendor.PUT("/:id/verify/identity", vendorHandler.ToggleIdentityVerification)
		adminVendor.PUT("/:id/verify/business", vendorHandler.ToggleBusinessVerification)
		adminVendor.DELETE("/:id", vendorHandler.DeleteVendor)
	}

	return router
}