// backend/main.go
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
	"eventify/backend/pkg/routes"
	"eventify/backend/pkg/services" // Import the new services package

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Flow: Configure Logging/Mode -> Connect DB -> Init Services -> Init Handlers -> Configure Router -> Start/Manage HTTP Server
func main() {
	// Step 1: Zerolog Setup and Gin Mode
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	log.Logger = log.Output(zerolog.ConsoleWriter{
		Out:        os.Stderr,
		TimeFormat: time.RFC3339,
	}).With().Timestamp().Logger()

	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}
// ------------------------------------------------------------------------------------------------------
	// Step 2: Database Initialization
	db.ConnectDB()
	log.Info().Msg("Database connection established successfully.")

	// Step 3: Get MongoDB database instance and collections
	dbClient := db.GetDB()
	eventsCollection := dbClient.Collection("events")

	// Step 4: Initialize Services (New Step)
	// The service layer handles business logic and DB communication.
	eventService := services.NewEventService(eventsCollection) 

	// Step 5: Initialize Handlers (Now depend on Services)
	// Initialize the AuthHandler (needs the entire DB client for user operations)
	authHandler := handlers.NewAuthHandler(dbClient) 

	// Initialize the EventHandler, passing the new EventService dependency
	eventHandler := handlers.NewEventHandler(eventService) 

	// Step 6: Gin Router Setup
	router := routes.ConfigureRouter(authHandler, eventHandler)

// ------------------------------------------------------------------------------------------------------
	// Step 7: Retrieve PORT and Server Configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	serverAddr := fmt.Sprintf(":%s", port)

	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Step 8: Start Server in Goroutine
	go func() {
		log.Info().
			Str("service", "eventify-api").
			Str("addr", serverAddr).
			Msgf("Starting server on %s (http://localhost%s)", serverAddr, serverAddr)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).
				Str("addr", serverAddr).
				Msg("Could not listen on address")
		}
	}()

	// Step 9: Graceful Shutdown
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
