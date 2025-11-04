// backend/pkg/repository/order_repo.go
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"eventify/backend/pkg/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"github.com/rs/zerolog/log"
)

type OrderRepository interface {
	GetOrderByReference(ctx context.Context, reference string) (*models.Order, error)
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Order, error)
	SavePendingOrder(ctx context.Context, order *models.Order) (primitive.ObjectID, error)
	UpdateOrderAndInsertTickets(ctx context.Context, order *models.Order, tickets []models.Ticket) error
	UpdateOrderStatus(ctx context.Context, id primitive.ObjectID, newStatus string) error
	IncrementWebhookAttempts(ctx context.Context, reference string) error
}

type MongoOrderRepository struct {
	OrderCollection  *mongo.Collection
	TicketCollection *mongo.Collection
}

func NewMongoOrderRepository(orderColl, ticketColl *mongo.Collection) *MongoOrderRepository {
	return &MongoOrderRepository{
		OrderCollection:  orderColl,
		TicketCollection: ticketColl,
	}
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

func (r *MongoOrderRepository) GetOrderByReference(ctx context.Context, reference string) (*models.Order, error) {
	filter := bson.M{"reference": reference}
	var order models.Order

	err := r.OrderCollection.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &order, nil
}

func (r *MongoOrderRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Order, error) {
	var order models.Order
	filter := bson.M{"_id": id}

	err := r.OrderCollection.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &order, nil
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

func (r *MongoOrderRepository) SavePendingOrder(ctx context.Context, order *models.Order) (primitive.ObjectID, error) {
	if order == nil {
		return primitive.NilObjectID, errors.New("order object cannot be nil")
	}

	order.ID = primitive.NewObjectID()
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()

	result, err := r.OrderCollection.InsertOne(ctx, order)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("failed to insert pending order: %w", err)
	}

	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		return oid, nil
	}

	return primitive.NilObjectID, errors.New("failed to retrieve inserted order object ID")
}

func (r *MongoOrderRepository) UpdateOrderStatus(ctx context.Context, id primitive.ObjectID, newStatus string) error {
	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"status":     newStatus,
			"updated_at": time.Now(),
		},
	}

	result, err := r.OrderCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update order status for ID %s: %w", id.Hex(), err)
	}

	if result.MatchedCount == 0 {
		return errors.New("order not found")
	}

	return nil
}

func (r *MongoOrderRepository) IncrementWebhookAttempts(ctx context.Context, reference string) error {
	filter := bson.M{"reference": reference}
	update := bson.M{
		"$inc": bson.M{"webhook_attempts": 1},
		"$set": bson.M{"updated_at": time.Now()},
	}

	result, err := r.OrderCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to increment webhook attempts for reference %s: %w", reference, err)
	}

	if result.MatchedCount == 0 {
		return errors.New("order reference not found during webhook attempt increment")
	}

	return nil
}

// ============================================================================
// ATOMIC AND IDEMPOTENT WRITE OPERATIONS
// ============================================================================

func (r *MongoOrderRepository) UpdateOrderAndInsertTickets(ctx context.Context, order *models.Order, tickets []models.Ticket) error {
	if order == nil || len(tickets) == 0 || order.ID.IsZero() {
		return errors.New("order object is invalid, tickets list is empty, or order ID is missing")
	}

	client := r.OrderCollection.Database().Client()
	session, err := client.StartSession()
	if err != nil {
		log.Error().Err(err).Msg("🚨 CRITICAL: Failed to start MongoDB session, cannot perform atomic update")
		return fmt.Errorf("transaction failed to start: %w", err)
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		return nil, r.executeOrderAndTicketUpdate(sessCtx, order, tickets)
	})

	if err != nil {
		log.Error().Err(err).Str("order_id", order.ID.Hex()).Msg("Transaction failed for order and ticket creation")
		return err
	}

	return nil
}

func (r *MongoOrderRepository) executeOrderAndTicketUpdate(ctx context.Context, order *models.Order, tickets []models.Ticket) error {
	now := time.Now()

	var ticketDocs []interface{}
	for i := range tickets {
		tickets[i].ID = primitive.NewObjectID()
		tickets[i].OrderID = order.ID
		tickets[i].CreatedAt = now
		tickets[i].UpdatedAt = now
		ticketDocs = append(ticketDocs, tickets[i])
	}

	updateFilter := bson.M{
		"_id":    order.ID,
		"status": "pending",
	}

	update := bson.M{
		"$set": bson.M{
			"status":          order.Status,
			"fee_kobo":        order.FeeKobo,
			"payment_channel": order.PaymentChannel,
			"paid_at":         order.PaidAt,
			"processed_by":    order.ProcessedBy,
			"updated_at":      now,
		},
	}

	result, err := r.OrderCollection.UpdateOne(ctx, updateFilter, update)
	if err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	if result.MatchedCount == 0 {
		existingOrder, checkErr := r.GetByID(ctx, order.ID)
		if checkErr != nil {
			return fmt.Errorf("failed to verify order existence: %w", checkErr)
		}

		if existingOrder == nil {
			return errors.New("order not found")
		}

		if existingOrder.Status == "success" {
			ticketCount, countErr := r.TicketCollection.CountDocuments(ctx, bson.M{"order_id": order.ID})
			if countErr != nil {
				return fmt.Errorf("failed to verify ticket existence: %w", countErr)
			}

			if ticketCount > 0 {
				log.Info().Str("order_id", order.ID.Hex()).Int64("existing_tickets", ticketCount).Msg("✅ Order already processed with tickets (idempotency success)")
				return nil
			}

			log.Error().Str("order_id", order.ID.Hex()).Str("reference", existingOrder.Reference).Msg("🚨 CRITICAL: Order marked success but no tickets found - repairing now")

			if _, err := r.TicketCollection.InsertMany(ctx, ticketDocs); err != nil {
				return fmt.Errorf("failed to repair missing tickets: %w", err)
			}

			log.Info().Str("order_id", order.ID.Hex()).Int("tickets_created", len(ticketDocs)).Msg("✅ Successfully repaired missing tickets for successful order")
			return nil
		}

		return fmt.Errorf("order status is '%s', cannot process (expected 'pending' or 'success')", existingOrder.Status)
	}

	if _, err := r.TicketCollection.InsertMany(ctx, ticketDocs); err != nil {
		return fmt.Errorf("failed to insert tickets (transaction will rollback): %w", err)
	}

	log.Info().Str("order_id", order.ID.Hex()).Int("tickets_created", len(ticketDocs)).Msg("✅ Order and tickets created successfully in transaction")
	return nil
}