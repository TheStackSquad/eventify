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
	"github.com/rs/zerolog/log"
)

// ConfigureRouter sets up all application routes and middleware.
func ConfigureRouter(
	authHandler *handlers.AuthHandler,
	eventHandler *handlers.EventHandler,
	vendorHandler *handlers.VendorHandler,
	authRepo repository.AuthRepository,
) *gin.Engine {
	router := gin.New()
	router.RedirectTrailingSlash = false

	// Global Middleware
	router.Use(gin.Recovery())
	router.Use(ginzerolog.SetLogger())

	router.Use(func(c *gin.Context) {
        log.Info().Str("path", c.Request.URL.Path).Msg("TRACE: Before CORS")
        c.Next()
    })

	// CORS Configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "HEAD", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	
	// 💡 TRACE POINT 2: Log AFTER CORS
    router.Use(func(c *gin.Context) {
        log.Info().Str("path", c.Request.URL.Path).Msg("TRACE: After CORS")
        c.Next()
    })

	// Basic Health Check Route
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Eventify API is running",
			"status":  "healthy",
		})
	})

	// Handle OPTIONS requests for CORS preflight
	router.OPTIONS("/*path", func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Status(http.StatusOK)
	})

	// -------------------------------------------------------------------
	// 1. PUBLIC ROUTES
	// -------------------------------------------------------------------
	auth := router.Group("/auth")
	{
		auth.POST("/signup", authHandler.Signup)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	vendorPublic := router.Group("/api/v1/vendors")
	{
		vendorPublic.GET("/", vendorHandler.ListVendors)
		vendorPublic.GET("/:id", vendorHandler.GetVendorProfile)
		vendorPublic.POST("/register", vendorHandler.RegisterVendor)
		vendorPublic.OPTIONS("/", vendorHandler.HandleOptions) // CORS preflight
		vendorPublic.OPTIONS("/:id", vendorHandler.HandleOptions) // CORS preflight
	}

	// -------------------------------------------------------------------
	// 2. PROTECTED ROUTES (Requiring AuthMiddleware)
	// -------------------------------------------------------------------
	// Use a single protected group for routes that don't share a logical URL prefix
	protected := router.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// Protected Auth Routes (e.g., fetching current user)
		protected.GET("/me", authHandler.GetCurrentUser)

		// Protected Event Routes (The client is hitting /create-events)
		// We define this route directly to ensure the path is exactly /create-events
		protected.POST("/create-events", eventHandler.CreateEvent)
		
		// FIX: Uncommented and corrected vendor update route
		protected.PUT("/api/v1/vendors/:id", vendorHandler.UpdateVendor)
	}

	// Protected Event Routes with /events prefix (for GET, PUT, DELETE, and LIKE)
	// These routes will now have the full prefix /events/...
	events := router.Group("/events")
	events.Use(middleware.AuthMiddleware())
	{
		events.GET("/my-events", eventHandler.GetUserEventsHandler)             // /events/my-events
		events.GET("/:eventId", eventHandler.GetEventByID)                     // /events/:eventId
		events.PUT("/:eventId", eventHandler.UpdateEvent)                      // /events/:eventId
		events.DELETE("/:eventId", eventHandler.DeleteEvent)                   // /events/:eventId
		
		// FIX: ADDED THE MISSING LIKE ENDPOINT
		events.POST("/:eventId/like", eventHandler.ToggleLikeHandler)          // /events/:eventId/like

		events.GET("/:eventId/analytics", eventHandler.FetchEventAnalytics)     // /events/:eventId/analytics
	}

	// -------------------------------------------------------------------
	// 3. ADMIN VENDOR VERIFICATION ROUTES (Requires Admin Auth Middleware)
	// -------------------------------------------------------------------
	adminVendor := router.Group("/api/v1/admin/vendors")
	adminVendor.Use(middleware.AuthMiddleware(), middleware.AdminMiddleware(authRepo))
	{
		adminVendor.PUT("/:id/verify/identity", vendorHandler.ToggleIdentityVerification)
		adminVendor.PUT("/:id/verify/business", vendorHandler.ToggleBusinessVerification)
		adminVendor.DELETE("/:id", vendorHandler.DeleteVendor)
		adminVendor.OPTIONS("/:id/verify/identity", vendorHandler.HandleOptions) // CORS preflight
		adminVendor.OPTIONS("/:id/verify/business", vendorHandler.HandleOptions) // CORS preflight
		adminVendor.OPTIONS("/:id", vendorHandler.HandleOptions) // CORS preflight
	}

	return router
}