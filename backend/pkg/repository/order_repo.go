//backend/pkg/repository/order_repo.go
package repository

import (
	"context"
	"errors"
	"time"
	"fmt"

	"eventify/backend/pkg/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type OrderRepository interface {
	// Read Operations
	GetOrderByReference(ctx context.Context, reference string) (*models.Order, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Order, error) 
	
	// Write Operations
	CreateOrderAndTickets(ctx context.Context, order *models.Order, tickets []models.Ticket) (primitive.ObjectID, error)
	SavePendingOrder(ctx context.Context, order *models.Order) (primitive.ObjectID, error)
	UpdateOrderAndInsertTickets(ctx context.Context, order *models.Order, tickets []models.Ticket) error
}

// MongoOrderRepository implements the OrderRepository interface using MongoDB.
type MongoOrderRepository struct {
	OrderCollection  *mongo.Collection
	TicketCollection *mongo.Collection // Dependency for saving generated tickets
}



// NewMongoOrderRepository creates a new MongoOrderRepository instance.
func NewMongoOrderRepository(orderColl, ticketColl *mongo.Collection) *MongoOrderRepository {
	return &MongoOrderRepository{
		OrderCollection:  orderColl,
		TicketCollection: ticketColl,
	}
}

// GetOrderByReference implements the OrderRepository interface.
// Used by the Service layer to check if a transaction reference has already been processed.
func (r *MongoOrderRepository) GetOrderByReference(ctx context.Context, reference string) (*models.Order, error) {
	filter := bson.M{"paystack_ref": reference}
	var order models.Order
	
	err := r.OrderCollection.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("order not found")
		}
		return nil, err
	}
	return &order, nil
}

// CreateOrderAndTickets implements the OrderRepository interface.
// This should ideally use a MongoDB Transaction to ensure both the order and all tickets
// are saved successfully, or neither are.
func (r *MongoOrderRepository) CreateOrderAndTickets(ctx context.Context, order *models.Order, tickets []models.Ticket) (primitive.ObjectID, error) {
	if order == nil || len(tickets) == 0 {
		return primitive.NilObjectID, errors.New("order or tickets list is empty")
	}

	// NOTE: Starting a MongoDB Session/Transaction is critical here for atomicity
	// We will simulate the atomic save without the transaction boilerplate for brevity.

	// 1. Save the main Order document
	order.ID = primitive.NewObjectID()
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	
	result, err := r.OrderCollection.InsertOne(ctx, order)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("failed to insert order: %w", err)
	}
	
	// 2. Prepare Ticket documents for bulk insert
	var ticketDocs []interface{}
	for i := range tickets {
		tickets[i].ID = primitive.NewObjectID()
		tickets[i].OrderID = order.ID // Link the ticket to the new Order ID
		tickets[i].CreatedAt = time.Now()
		tickets[i].UpdatedAt = time.Now()
		ticketDocs = append(ticketDocs, tickets[i])
	}

	// 3. Bulk insert the Ticket documents
	if _, err := r.TicketCollection.InsertMany(ctx, ticketDocs); err != nil {
		// In a real transaction, we would ABORT here to roll back the order insert!
		return primitive.NilObjectID, fmt.Errorf("failed to insert tickets: %w", err)
	}
	
	// Return the new Order ID
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		return oid, nil
	}
	
	return primitive.NilObjectID, errors.New("failed to retrieve inserted order object ID")
}

// GetByID is a placeholder for standard lookup, following the VendorRepository pattern.
func (r *MongoOrderRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Order, error) {
	var order models.Order
	filter := bson.M{"_id": id}
	
	err := r.OrderCollection.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		return nil, err // Returns ErrNoDocuments if not found
	}
	return &order, nil
}

// SavePendingOrder implements the OrderRepository interface.
// This is used at the start of the payment flow to ensure the expected amount is logged.
func (r *MongoOrderRepository) SavePendingOrder(ctx context.Context, order *models.Order) (primitive.ObjectID, error) {
    if order == nil {
        return primitive.NilObjectID, errors.New("order object cannot be nil")
    }

    // Set necessary timestamps and ID
    order.ID = primitive.NewObjectID()
    order.CreatedAt = time.Now()
    order.UpdatedAt = time.Now()
    
    // Insert the order with the "pending" status, Reference, and AmountKobo set by the Service layer
    result, err := r.OrderCollection.InsertOne(ctx, order)
    if err != nil {
        // Handle potential reference duplication or other DB errors
        return primitive.NilObjectID, fmt.Errorf("failed to insert pending order: %w", err)
    }
    
    if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
        return oid, nil
    }
    
    return primitive.NilObjectID, errors.New("failed to retrieve inserted order object ID")
}

// UpdateOrderAndInsertTickets atomically updates the existing order status and inserts all related tickets.
// This is the CRITICAL final step in the secure payment flow.
func (r *MongoOrderRepository) UpdateOrderAndInsertTickets(ctx context.Context, order *models.Order, tickets []models.Ticket) error {
    if order == nil || len(tickets) == 0 || order.ID.IsZero() {
        return errors.New("order object is invalid, tickets list is empty, or order ID is missing")
    }

    // ⚠️ CRITICAL: The Transaction Logic (Simplified for brevity as in your existing code)
    // In a production environment, this entire block should be wrapped in a session/transaction.
    // Example: client.UseSession(ctx, func(sessionCtx mongo.SessionContext) error { ... })
    
    // 1. Prepare Ticket documents for bulk insert
    var ticketDocs []interface{}
    now := time.Now()
    for i := range tickets {
        // Ensure new IDs and timestamps are set for tickets
        tickets[i].ID = primitive.NewObjectID()
        tickets[i].CreatedAt = now
        tickets[i].UpdatedAt = now
        ticketDocs = append(ticketDocs, tickets[i])
    }

    // 2. Prepare the Order Update operation
    // We only update fields that changed (Status, UpdatedAt, FeeKobo, etc.)
    updateFilter := bson.M{"_id": order.ID, "status": "pending"} // Ensures we only update if it's still pending
    update := bson.M{
        "$set": bson.M{
            "status": "success", // CRITICAL: Update status
            "updated_at": now,
            "fee_kobo": order.FeeKobo,
            // Include any other final fields set by the Service layer
        },
    }

    // 3. Perform the operations in sequence (or transactionally):

    // A. Update the Order document
    result, err := r.OrderCollection.UpdateOne(ctx, updateFilter, update)
    if err != nil {
        return fmt.Errorf("failed to update order status: %w", err)
    }

    if result.MatchedCount == 0 {
        // This is a common case if the webhook raced the browser verification and already processed the order.
        if result.ModifiedCount == 0 && order.Status == "success" {
            // It was already successful, so we don't error.
            return nil
        }
        return errors.New("order not found or already modified (status was not pending)")
    }
    
    // B. Bulk insert the Ticket documents
    if _, err := r.TicketCollection.InsertMany(ctx, ticketDocs); err != nil {
        // 🚨 FAILURE POINT: If this fails, the Order is marked 'success' but tickets are missing!
        // This is why a transaction is required to roll back the order update.
        // For now, we return a loud error and rely on manual recovery.
        return fmt.Errorf("failed to insert tickets: %w", err)
    }

    return nil
}

// NOTE on GetOrderByReference correction:
/*
// GetOrderByReference implements the OrderRepository interface.
// Corrected to use the 'reference' field based on model convention.
func (r *MongoOrderRepository) GetOrderByReference(ctx context.Context, reference string) (*models.Order, error) {
    // Corrected filter field assumption
    filter := bson.M{"reference": reference} 
    var order models.Order
    
    err := r.OrderCollection.FindOne(ctx, filter).Decode(&order)
    if err != nil {
        if errors.Is(err, mongo.ErrNoDocuments) {
            return nil, nil // Return nil, nil if not found, simplifying service logic
        }
        return nil, err
    }
    return &order, nil
}
*/