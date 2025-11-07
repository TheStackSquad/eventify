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
	FinalizeOrderAtomically(ctx context.Context, order *models.Order, tickets []models.Ticket, eventRepo EventRepository) error // ✅ NEW
	UpdateOrderStatus(ctx context.Context, id primitive.ObjectID, newStatus string) error
	IncrementWebhookAttempts(ctx context.Context, reference string) error
}

type MongoOrderRepository struct {
	OrderCollection  *mongo.Collection
	TicketCollection *mongo.Collection
	Client           *mongo.Client // ✅ ADD: Need client for transactions
}

func NewMongoOrderRepository(client *mongo.Client, orderColl, ticketColl *mongo.Collection) *MongoOrderRepository {
	return &MongoOrderRepository{
		OrderCollection:  orderColl,
		TicketCollection: ticketColl,
		Client:           client, // ✅ NEW
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
// ✅ NEW: FULLY ATOMIC FINALIZATION WITH STOCK REDUCTION
// ============================================================================

// FinalizeOrderAtomically performs ALL operations in a single transaction:
// 1. Sets order to "processing" (prevents race conditions)
// 2. Reduces ticket stock in events collection
// 3. Updates order status to "success"
// 4. Creates tickets
// ALL operations succeed together or ALL rollback
func (r *MongoOrderRepository) FinalizeOrderAtomically(
	ctx context.Context,
	order *models.Order,
	tickets []models.Ticket,
	eventRepo EventRepository,
) error {
	if order == nil || len(tickets) == 0 || order.ID.IsZero() {
		return errors.New("invalid order, tickets empty, or order ID missing")
	}

	log.Info().
		Str("order_id", order.ID.Hex()).
		Str("reference", order.Reference).
		Int("ticket_count", len(tickets)).
		Msg("🔒 Starting ATOMIC transaction for order finalization")

	// Start MongoDB session for transaction
	session, err := r.Client.StartSession()
	if err != nil {
		log.Error().Err(err).Msg("🚨 CRITICAL: Failed to start MongoDB session")
		return fmt.Errorf("transaction failed to start: %w", err)
	}
	defer session.EndSession(ctx)

	// Execute transaction - ALL OR NOTHING
	_, err = session.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		now := time.Now()

		// ============================================================
		// STEP 1: ATOMIC STATUS CHECK AND LOCK
		// ============================================================
		// This prevents race conditions by atomically checking status
		// and setting to "processing" in one operation
		lockFilter := bson.M{
			"_id":    order.ID,
			"status": "pending", // Only proceed if still pending
		}

		lockUpdate := bson.M{
			"$set": bson.M{
				"status":     "processing", // Lock the order
				"updated_at": now,
			},
		}

		lockResult, err := r.OrderCollection.UpdateOne(sessCtx, lockFilter, lockUpdate)
		if err != nil {
			log.Error().Err(err).Str("order_id", order.ID.Hex()).Msg("Failed to lock order")
			return nil, fmt.Errorf("failed to lock order: %w", err)
		}

		// Check if we got the lock
		if lockResult.MatchedCount == 0 {
			// Order is not in pending state - check why
			existingOrder, checkErr := r.GetByID(sessCtx, order.ID)
			if checkErr != nil {
				return nil, fmt.Errorf("failed to verify order: %w", checkErr)
			}

			if existingOrder == nil {
				return nil, errors.New("order not found")
			}

			if existingOrder.Status == "success" {
				// Already processed successfully (idempotency)
				log.Info().
					Str("order_id", order.ID.Hex()).
					Msg("✅ Order already processed successfully (idempotent)")
				return nil, nil // Success - already done
			}

			// Order is in another state (processing, failed, fraud)
			return nil, fmt.Errorf("order status is '%s', cannot process", existingOrder.Status)
		}

		log.Info().Str("order_id", order.ID.Hex()).Msg("✅ Order locked for processing")

		// ============================================================
		// STEP 2: REDUCE TICKET STOCK (CRITICAL - PREVENTS OVERSELLING)
		// ============================================================
		// Group items by event and tier for efficient stock reduction
		stockReductions := make(map[string]map[string]int) // event_id -> tier_name -> quantity

		for _, item := range order.Items {
			if stockReductions[item.EventID] == nil {
				stockReductions[item.EventID] = make(map[string]int)
			}
			stockReductions[item.EventID][item.TierName] += item.Quantity
		}

		// Reduce stock for each event/tier combination
		for eventID, tierQuantities := range stockReductions {
			for tierName, quantity := range tierQuantities {
				log.Info().
					Str("event_id", eventID).
					Str("tier", tierName).
					Int("quantity", quantity).
					Msg("🎟️ Reducing ticket stock")

				err := eventRepo.DecrementTicketStock(sessCtx, eventID, tierName, quantity)
				if err != nil {
					log.Error().
						Err(err).
						Str("event_id", eventID).
						Str("tier", tierName).
						Int("quantity", quantity).
						Msg("❌ CRITICAL: Failed to reduce ticket stock - ROLLING BACK")
					return nil, fmt.Errorf("failed to reduce stock for event %s tier %s: %w", eventID, tierName, err)
				}

				log.Info().
					Str("event_id", eventID).
					Str("tier", tierName).
					Int("quantity", quantity).
					Msg("✅ Stock reduced successfully")
			}
		}

		// ============================================================
		// STEP 3: UPDATE ORDER TO SUCCESS
		// ============================================================
		finalizeFilter := bson.M{
			"_id":    order.ID,
			"status": "processing", // Only update if still processing (we set this)
		}

		finalizeUpdate := bson.M{
			"$set": bson.M{
				"status":          "success",
				"fee_kobo":        order.FeeKobo,
				"payment_channel": order.PaymentChannel,
				"paid_at":         order.PaidAt,
				"processed_by":    order.ProcessedBy,
				"updated_at":      now,
			},
		}

		updateResult, err := r.OrderCollection.UpdateOne(sessCtx, finalizeFilter, finalizeUpdate)
		if err != nil {
			log.Error().Err(err).Msg("Failed to finalize order status")
			return nil, fmt.Errorf("failed to finalize order: %w", err)
		}

		if updateResult.MatchedCount == 0 {
			return nil, errors.New("order status changed during processing")
		}

		log.Info().Str("order_id", order.ID.Hex()).Msg("✅ Order status updated to success")

		// ============================================================
		// STEP 4: INSERT TICKETS
		// ============================================================
		var ticketDocs []interface{}
		for i := range tickets {
			tickets[i].ID = primitive.NewObjectID()
			tickets[i].OrderID = order.ID
			tickets[i].CreatedAt = now
			tickets[i].UpdatedAt = now
			ticketDocs = append(ticketDocs, tickets[i])
		}

		if _, err := r.TicketCollection.InsertMany(sessCtx, ticketDocs); err != nil {
			log.Error().Err(err).Msg("Failed to insert tickets - ROLLING BACK")
			return nil, fmt.Errorf("failed to insert tickets: %w", err)
		}

		log.Info().
			Str("order_id", order.ID.Hex()).
			Int("tickets_created", len(ticketDocs)).
			Msg("✅ Tickets created successfully")

		// ============================================================
		// TRANSACTION SUCCESS
		// ============================================================
		log.Info().
			Str("order_id", order.ID.Hex()).
			Str("reference", order.Reference).
			Int("tickets", len(ticketDocs)).
			Msg("✅✅✅ ATOMIC TRANSACTION COMPLETED SUCCESSFULLY")

		return nil, nil
	})

	if err != nil {
		log.Error().
			Err(err).
			Str("order_id", order.ID.Hex()).
			Msg("❌ Transaction FAILED and ROLLED BACK - No changes made")

		// Attempt to reset status from "processing" back to "pending" for retry
		// This is a best-effort cleanup and doesn't affect the transaction rollback
		_ = r.UpdateOrderStatus(ctx, order.ID, "pending")

		return fmt.Errorf("atomic transaction failed: %w", err)
	}

	log.Info().
		Str("order_id", order.ID.Hex()).
		Msg("🎉 Order finalization fully atomic and complete")

	return nil
}

// ============================================================================
// LEGACY METHOD (Keep for backward compatibility but prefer FinalizeOrderAtomically)
// ============================================================================

// UpdateOrderAndInsertTickets - LEGACY method without stock reduction
// ⚠️ WARNING: This doesn't reduce ticket stock. Use FinalizeOrderAtomically instead
func (r *MongoOrderRepository) UpdateOrderAndInsertTickets(ctx context.Context, order *models.Order, tickets []models.Ticket) error {
	log.Warn().Msg("⚠️ Using legacy UpdateOrderAndInsertTickets - consider using FinalizeOrderAtomically")

	if order == nil || len(tickets) == 0 || order.ID.IsZero() {
		return errors.New("order object is invalid, tickets list is empty, or order ID is missing")
	}

	session, err := r.Client.StartSession()
	if err != nil {
		log.Error().Err(err).Msg("🚨 CRITICAL: Failed to start MongoDB session")
		return fmt.Errorf("transaction failed to start: %w", err)
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		return nil, r.executeOrderAndTicketUpdate(sessCtx, order, tickets)
	})

	if err != nil {
		log.Error().Err(err).Str("order_id", order.ID.Hex()).Msg("Transaction failed")
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
				log.Info().Str("order_id", order.ID.Hex()).Msg("✅ Already processed (idempotent)")
				return nil
			}

			log.Error().Str("order_id", order.ID.Hex()).Msg("🚨 Order success but no tickets - repairing")

			if _, err := r.TicketCollection.InsertMany(ctx, ticketDocs); err != nil {
				return fmt.Errorf("failed to repair tickets: %w", err)
			}

			log.Info().Str("order_id", order.ID.Hex()).Msg("✅ Repaired missing tickets")
			return nil
		}

		return fmt.Errorf("order status is '%s', cannot process", existingOrder.Status)
	}

	if _, err := r.TicketCollection.InsertMany(ctx, ticketDocs); err != nil {
		return fmt.Errorf("failed to insert tickets: %w", err)
	}

	log.Info().Str("order_id", order.ID.Hex()).Int("tickets", len(ticketDocs)).Msg("✅ Order and tickets created")
	return nil
}