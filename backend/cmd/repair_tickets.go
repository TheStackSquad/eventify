// backend/cmd/repair_tickets/main.go
// ONE-TIME SCRIPT: Repairs orders that have status="success" but no tickets
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"eventify/backend/pkg/models"
	"eventify/backend/pkg/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Configuration
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}
	
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "eventify"
	}

	// Specific order to repair (your broken order)
	orderReference := "TIX_1762152441055_a0b31303"

	fmt.Println("🔧 Starting Ticket Repair Script")
	fmt.Printf("📊 Target Order: %s\n", orderReference)
	fmt.Println("----------------------------------------")

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	// Get collections
	orderCollection := client.Database(dbName).Collection("orders")
	ticketCollection := client.Database(dbName).Collection("tickets")

	// Fetch the order
	var order models.Order
	err = orderCollection.FindOne(ctx, bson.M{"reference": orderReference}).Decode(&order)
	if err != nil {
		log.Fatalf("❌ Failed to find order: %v", err)
	}

	fmt.Printf("✅ Found Order: %s\n", order.ID.Hex())
	fmt.Printf("   Status: %s\n", order.Status)
	fmt.Printf("   Customer: %s %s (%s)\n", order.Customer.FirstName, order.Customer.LastName, order.Customer.Email)
	fmt.Printf("   Items: %d\n", len(order.Items))

	// Check if order is in "success" state
	if order.Status != "success" {
		log.Fatalf("❌ Order status is '%s', not 'success'. Cannot repair.", order.Status)
	}

	// Check if tickets already exist
	ticketCount, err := ticketCollection.CountDocuments(ctx, bson.M{"order_id": order.ID})
	if err != nil {
		log.Fatalf("❌ Failed to count existing tickets: %v", err)
	}

	if ticketCount > 0 {
		fmt.Printf("Order already has %d tickets. No repair needed.\n", ticketCount)
		return
	}

	fmt.Println("\n🚨 CONFIRMED: Order marked 'success' but has NO tickets!")
	fmt.Println("🔧 Generating missing tickets now...\n")

	// Generate tickets
	var ticketsToInsert []interface{}
	ticketIndex := 0
	now := time.Now()

	for itemIdx, item := range order.Items {
		fmt.Printf("📦 Processing Item %d: %s (%s)\n", itemIdx+1, item.EventTitle, item.TierName)
		fmt.Printf("   Quantity: %d, Price: ₦%.2f each\n", item.Quantity, float64(item.Price)/100)

		for i := 0; i < item.Quantity; i++ {
			ticket := models.Ticket{
				ID:         primitive.NewObjectID(),
				Code:       utils.GenerateUniqueTicketCode(order.Reference, ticketIndex),
				OrderID:    order.ID,
				EventID:    item.EventID,
				EventTitle: item.EventTitle,
				TierName:   item.TierName,
				Price:      item.Price,
				OwnerEmail: order.Customer.Email,
				OwnerName:  order.Customer.FirstName + " " + order.Customer.LastName,
				IsUsed:     false,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			
			ticketsToInsert = append(ticketsToInsert, ticket)
			ticketIndex++
			
			fmt.Printf("   ✓ Ticket %d: %s\n", ticketIndex, ticket.Code)
		}
	}

	fmt.Printf("\n🎫 Generated %d tickets\n", len(ticketsToInsert))
	fmt.Println("💾 Inserting into database...")

	// Insert tickets
	result, err := ticketCollection.InsertMany(ctx, ticketsToInsert)
	if err != nil {
		log.Fatalf("❌ Failed to insert tickets: %v", err)
	}

	fmt.Printf("✅ Successfully inserted %d tickets!\n", len(result.InsertedIDs))
	fmt.Println("\n🎉 REPAIR COMPLETE!")
	fmt.Println("----------------------------------------")
	fmt.Println("📧 Next Steps:")
	fmt.Println("   1. Verify tickets in database")
	fmt.Println("   2. Send confirmation email to customer")
	fmt.Println("   3. Review logs to prevent future occurrences")
}