// backend/pkg/routes/router.go

package routes

import (
	"net/http"
	"time"

	"eventify/backend/pkg/handlers"
	"eventify/backend/pkg/middleware"

	"github.com/gin-contrib/cors"
	ginzerolog "github.com/gin-contrib/logger"
	"github.com/gin-gonic/gin"
)


// ConfigureRouter sets up all application routes and middleware.
func ConfigureRouter(authHandler *handlers.AuthHandler, eventHandler *handlers.EventHandler) *gin.Engine {
	router := gin.New()

	// Global Middleware
	router.Use(gin.Recovery())
	router.Use(ginzerolog.SetLogger())

	// CORS Configuration 
	router.Use(cors.New(cors.Config{
		AllowOrigins: 	   []string{"http://localhost:3000"},
		AllowMethods: 	   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: 	   []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders: 	   []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge: 		   12 * time.Hour,
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
	// 2. PROTECTED ROUTES (Requiring AuthMiddleware)
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
		// Creation and Retrieval
		events.POST("/create", eventHandler.CreateEvent)
		events.GET("/my-events", eventHandler.GetUserEventsHandler)

		// ⭐️ NEW: Get Single Event by ID (for pre-filling edit form)
		events.GET("/:eventId", eventHandler.GetEventByID)
		
		// ⭐️ NEW: Update (PUT) -> Maps to updateEvent action
		events.PUT("/:eventId", eventHandler.UpdateEvent)
		
		// ⭐️ NEW: Delete (DELETE) -> Maps to deleteEvent action (soft delete)
		events.DELETE("/:eventId", eventHandler.DeleteEvent)
		
		// ⭐️ NEW: Analytics (GET) -> Maps to fetchEventAnalytics action
		events.GET("/:eventId/analytics", eventHandler.FetchEventAnalytics)
	}

	return router
}