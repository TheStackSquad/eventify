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

	// Global Middleware - ORDER MATTERS!
	router.Use(gin.Recovery())
	
	// Custom request logger - put this BEFORE ginzerolog
	router.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		
		c.Next()
		
		log.Info().
			Str("method", c.Request.Method).
			Str("path", path).
			Str("query", query).
			Int("status", c.Writer.Status()).
			Str("latency", time.Since(start).String()).
			Msg("📥 HTTP Request")
	})

	// Gin zerolog middleware
	router.Use(ginzerolog.SetLogger())

	// CORS Configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "HEAD", "PATCH", "DELETE", "OPTIONS"},
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
	// 1. PUBLIC ROUTES
	// -------------------------------------------------------------------
	auth := router.Group("/auth")
	{
		auth.POST("/signup", authHandler.Signup)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	// VENDOR PUBLIC ROUTES - Make this explicit
	log.Info().Msg("🚀 Registering vendor routes...")
	
	vendorRoutes := router.Group("/api/v1/vendors")
	{
		// Add debug logging to each route handler
		vendorRoutes.GET("", func(c *gin.Context) {
			log.Info().Str("path", c.Request.URL.Path).Msg("🎯 ListVendors route hit!")
			vendorHandler.ListVendors(c)
		})
		vendorRoutes.GET("/:id", vendorHandler.GetVendorProfile)
		vendorRoutes.POST("/register", vendorHandler.RegisterVendor)
	}

	// -------------------------------------------------------------------
	// 2. PROTECTED ROUTES
	// -------------------------------------------------------------------
	protected := router.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/me", authHandler.GetCurrentUser)
		protected.POST("/create-events", eventHandler.CreateEvent)
		protected.PUT("/api/v1/vendors/:id", vendorHandler.UpdateVendor)
	}

	// Protected Event Routes
	events := router.Group("/events")
	events.Use(middleware.AuthMiddleware())
	{
		events.GET("", eventHandler.GetAllEventsHandler)  
		events.GET("/my-events", eventHandler.GetUserEventsHandler)
		events.GET("/:eventId", eventHandler.GetEventByID)
		events.PUT("/:eventId", eventHandler.UpdateEvent)
		events.DELETE("/:eventId", eventHandler.DeleteEvent)
		events.POST("/:eventId/like", eventHandler.ToggleLikeHandler)
		events.GET("/:eventId/analytics", eventHandler.FetchEventAnalytics)
	}

	// -------------------------------------------------------------------
	// 3. ADMIN ROUTES
	// -------------------------------------------------------------------
	adminVendor := router.Group("/api/v1/admin/vendors")
	adminVendor.Use(middleware.AuthMiddleware(), middleware.AdminMiddleware(authRepo))
	{
		adminVendor.PUT("/:id/verify/identity", vendorHandler.ToggleIdentityVerification)
		adminVendor.PUT("/:id/verify/business", vendorHandler.ToggleBusinessVerification)
		adminVendor.DELETE("/:id", vendorHandler.DeleteVendor)
	}

	// Print all registered routes for debugging
	printRegisteredRoutes(router)

	return router
}

// Helper function to print all registered routes
func printRegisteredRoutes(router *gin.Engine) {
	log.Info().Msg("🔍 === REGISTERED ROUTES ===")
	for _, route := range router.Routes() {
		log.Info().Str("method", route.Method).Str("path", route.Path).Msg("Route")
	}
	log.Info().Msg("🔍 =========================")
}