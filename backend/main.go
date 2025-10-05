package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"eventify/backend/pkg/db"
	"eventify/backend/pkg/handlers"

	"github.com/gin-contrib/cors"
	ginzerolog "github.com/gin-contrib/logger" // Renamed import for clarity
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	// --- Zerolog Setup (Must be done first) ---
	// Set global log level based on environment
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	// Configure Zerolog for human-readable console output
	log.Logger = log.Output(zerolog.ConsoleWriter{
		Out:        os.Stderr,
		TimeFormat: time.RFC3339,
	}).With().Timestamp().Logger()

	// Ensure Gin runs in release mode in production
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		// Set Gin mode to debug (optional, depends on environment)
		gin.SetMode(gin.DebugMode)
	}

	// --- Step 1: Database Initialization ---
	db.ConnectDB()
	log.Info().Msg("Database connection established successfully.")

	// --- Step 2: Get MongoDB database instance ---
	dbClient := db.GetDB()

	// --- Step 3: Initialize Handlers ---
	authHandler := handlers.NewAuthHandler(dbClient)

	// --- Step 4: Gin Router Setup ---
	// Note: The logger dependency is now managed within setupRouter
	router := setupRouter(authHandler)

	// Retrieve PORT from environment variables, default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	serverAddr := fmt.Sprintf(":%s", port)

	// --- Step 5: HTTP Server with Gin ---
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// --- Step 6: Start Server in Goroutine ---
	go func() {
		log.Info().
			Str("service", "eventify-api").
			Str("addr", serverAddr).
			Msgf("Starting server on %s (http://localhost%s)", serverAddr, serverAddr)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			// Critical failure logging with structured data
			log.Fatal().Err(err).
				Str("addr", serverAddr).
				Msg("Could not listen on address")
		}
	}()

	// --- Step 7: Graceful Shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Warn().Msg("Server shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	db.CloseDB()
	log.Info().Msg("MongoDB disconnected and server stopped gracefully.")
}

// -----------------------------------------------------------------------------
// --- Step 8: Gin Router Configuration with Handlers ---
func setupRouter(authHandler *handlers.AuthHandler) *gin.Engine {
	// --- CHANGE: Use gin.New() to remove default logging and recovery ---
	router := gin.New()

	// --- ADD: Zerolog Middleware for request logging and recovery ---
	// 1. Recovery Middleware: Catches panics and returns a 500, logging the stack.
	router.Use(gin.Recovery()) 
	
	// 2. Zerolog Request Logger Middleware
	// We use the imported 'ginzerolog' (github.com/gin-contrib/logger)
	router.Use(ginzerolog.SetLogger())

	// --- Step 9: CORS Configuration for Next.js Frontend ---
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// --- Step 10: Basic Health Check Route ---
	router.GET("/", func(c *gin.Context) {
		// Application-specific log, separate from the request log middleware
		log.Ctx(c.Request.Context()).
			Debug(). // Changed to Debug level for less noise
			Str("path", c.Request.URL.Path).
			Msg("Health check endpoint hit")

		c.JSON(http.StatusOK, gin.H{
			"message": "Eventify API is running",
			"status":  "healthy",
		})
	})

	// --- Step 11: API Routes with Route Groups ---
	auth := router.Group("/auth")
	{
		auth.POST("/signup", authHandler.Signup)
		auth.POST("/login", authHandler.Login)
	}

	return router
}