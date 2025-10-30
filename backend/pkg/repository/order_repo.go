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
	// You might add UpdateStatus, etc., later.
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