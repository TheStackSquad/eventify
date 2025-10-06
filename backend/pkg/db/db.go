/*//backend/pkg/db/db.go*/

package db

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "github.com/joho/godotenv" // Library often used to load .env files
)

// Client is the global MongoDB client instance accessible to all packages.
var Client *mongo.Client 
const DatabaseName = "bandhit" 

// Initialize loads environment variables from the .env file in the root
// of the backend directory.
func Initialize() {
    // Attempt to load .env file. Ignore error if file doesn't exist (e.g., in production)
    // but log a warning if running locally and it fails.
    if err := godotenv.Load(".env"); err != nil {
        log.Println("Warning: Could not load .env file. Assuming environment variables are set externally.")
    }
}

// ConnectDB establishes the connection to MongoDB and sets the global Client.
func ConnectDB() {
    // 1. Ensure environment is initialized (to load MONGO_URI)
    Initialize() 
    
    // 2. Retrieve the URI
    mongoURI := os.Getenv("MONGO_URI")
    if mongoURI == "" {
        log.Fatal("FATAL: MONGO_URI environment variable is not set. Check your backend/.env file.")
    }

    // 3. Set up connection options and context
    clientOptions := options.Client().ApplyURI(mongoURI)

    // Set a context with a timeout for the connection attempt
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // 4. Connect to MongoDB
    client, err := mongo.Connect(ctx, clientOptions)
    if err != nil {
        log.Fatalf("FATAL: Failed to connect to MongoDB: %v", err)
    }

    // 5. Verify the connection (Ping)
    if err = client.Ping(ctx, nil); err != nil {
        log.Fatalf("FATAL: Failed to ping MongoDB. Ensure the database service is running: %v", err)
    }

    log.Printf("SUCCESS: Connected to MongoDB at %s.", mongoURI)
    Client = client
}

// GetDB returns the MongoDB database instance for direct access
func GetDB() *mongo.Database {
    if Client == nil {
        log.Fatal("FATAL: MongoDB Client is not initialized. Call ConnectDB first.")
    }
    return Client.Database(DatabaseName)
}
// GetCollection returns a handle to the specified collection within the "eventify" database.
func GetCollection(collectionName string) *mongo.Collection {
    if Client == nil {
        // This should not happen if ConnectDB is called on startup, but is a safety check.
        log.Panic("FATAL: MongoDB Client is not initialized. Call ConnectDB first.")
        return nil
    }
    return Client.Database(DatabaseName).Collection(collectionName)
}

// CloseDB disconnects the client. Should be called when the application shuts down.
func CloseDB() {
    if Client != nil {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := Client.Disconnect(ctx); err != nil {
            log.Printf("Warning: Error closing MongoDB connection: %v", err)
        } else {
            fmt.Println("INFO: Disconnected from MongoDB.")
        }
    }
}
