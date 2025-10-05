package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"eventify/backend/pkg"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// --- Step 1: Database Initialization ---
	db.ConnectDB()
	log.Println("Database connection established successfully.")

	// --- Step 2: Gin Router Setup ---
	router := setupRouter()

	// Retrieve PORT from environment variables, default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	serverAddr := fmt.Sprintf(":%s", port)
	
	// --- Step 3: HTTP Server with Gin ---
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: router, // Gin router is compatible with http.Handler
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// --- Step 4: Start Server in Goroutine ---
	go func() {
		log.Printf("INFO: Starting server on %s (http://localhost%s)", serverAddr, serverAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("FATAL: Could not listen on %s: %v", serverAddr, err)
		}
	}()

	// --- Step 5: Graceful Shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("INFO: Server shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("FATAL: Server forced to shutdown: %v", err)
	}

	db.CloseDB()
	log.Println("INFO: MongoDB disconnected and server stopped gracefully.")
}

// --- Step 6: Gin Router Configuration ---
func setupRouter() *gin.Engine {
	// Initialize Gin router
	router := gin.Default()

	// --- Step 7: CORS Configuration for Next.js Frontend ---
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // Your Next.js dev server
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// --- Step 8: Basic Health Check Route ---
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Eventify API is running",
			"status":  "healthy",
		})
	})

	// --- Step 9: API Routes Setup ---
	// Auth routes matching your Redux actions
	router.POST("/signup", signupHandler)
	router.POST("/login", loginHandler)

	// You can also group routes later:
	// auth := router.Group("/auth")
	// {
	//     auth.POST("/signup", signupHandler)
	//     auth.POST("/login", loginHandler)
	// }

	return router
}

// --- Step 10: Placeholder Handler Functions ---
// These will be implemented in your pkg/handlers package later
func signupHandler(c *gin.Context) {
	// TODO: Implement signup logic
	c.JSON(http.StatusOK, gin.H{
		"message": "Signup endpoint - to be implemented",
	})
}

func loginHandler(c *gin.Context) {
	// TODO: Implement login logic  
	c.JSON(http.StatusOK, gin.H{
		"message": "Login endpoint - to be implemented",
	})
}