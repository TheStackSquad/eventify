// backend/pkg/repository/reviews_repo.go
package repository

import (
	"context"
	"time"
	"errors"

	"eventify/backend/pkg/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ReviewRepository defines the contract for vendor review data operations,
// ensuring the Service Layer is decoupled from the MongoDB implementation.
type ReviewRepository interface {
	Create(ctx context.Context, review *models.Review) error
	GetByVendorID(ctx context.Context, vendorID primitive.ObjectID) ([]models.Review, error)
	GetApprovedByVendorID(ctx context.Context, vendorID primitive.ObjectID) ([]models.Review, error)
	GetAverageRating(ctx context.Context, vendorID primitive.ObjectID) (float64, int64, error)
	GetApprovedAverageRating(ctx context.Context, vendorID primitive.ObjectID) (float64, int64, error)
	UpdateApprovalStatus(ctx context.Context, reviewID primitive.ObjectID, isApproved bool) error
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.Review, error) // ✅ ADDED to interface
}

// MongoReviewRepository implements the ReviewRepository interface using a MongoDB collection.
type MongoReviewRepository struct {
	Collection *mongo.Collection
}

// NewMongoReviewRepository creates a new repository instance, accepting a *mongo.Collection.
func NewMongoReviewRepository(collection *mongo.Collection) *MongoReviewRepository {
	return &MongoReviewRepository{
		Collection: collection,
	}
}

// Create inserts a new review or updates an existing one based on user_id OR ip_address.
func (r *MongoReviewRepository) Create(ctx context.Context, review *models.Review) error {
	review.UpdatedAt = time.Now()
	review.CreatedAt = time.Now()
	review.IsApproved = false // Default to false for moderation

	if review.ID.IsZero() {
		review.ID = primitive.NewObjectID()
	}

	// ✅ BUILD SMART FILTER: Check by UserID (if authenticated) OR IPAddress (if anonymous)
	var filter bson.M

	if !review.UserID.IsZero() {
		// Authenticated user - check by vendor_id + user_id
		filter = bson.M{
			"vendor_id": review.VendorID,
			"user_id":   review.UserID,
		}
	} else if review.IPAddress != "" {
		// Anonymous user - check by vendor_id + ip_address
		filter = bson.M{
			"vendor_id":  review.VendorID,
			"ip_address": review.IPAddress,
			"user_id":    primitive.NilObjectID,
		}
	} else {
		// Neither UserID nor IPAddress provided - reject
		return errors.New("either user_id or ip_address must be provided")
	}

	// Update existing review or insert new one
	update := bson.M{
		"$set": bson.M{
			"rating":      review.Rating,
			"comment":     review.Comment,
			"user_name":   review.UserName,
			"updated_at":  review.UpdatedAt,
			"is_approved": review.IsApproved,
			"ip_address":  review.IPAddress,
		},
		"$setOnInsert": bson.M{
			"_id":        review.ID,
			"vendor_id":  review.VendorID,
			"user_id":    review.UserID,
			"created_at": review.CreatedAt,
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := r.Collection.UpdateOne(ctx, filter, update, opts)
	return err
}

// GetByVendorID retrieves all reviews for a specific vendor (including unapproved ones).
func (r *MongoReviewRepository) GetByVendorID(ctx context.Context, vendorID primitive.ObjectID) ([]models.Review, error) {
	var reviews []models.Review

	filter := bson.M{"vendor_id": vendorID}
	opts := options.Find().SetSort(bson.M{"created_at": -1})

	cursor, err := r.Collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var rev models.Review
		if err := cursor.Decode(&rev); err != nil {
			return nil, err
		}
		reviews = append(reviews, rev)
	}

	return reviews, nil
}

// GetApprovedByVendorID retrieves only approved reviews for a specific vendor.
func (r *MongoReviewRepository) GetApprovedByVendorID(ctx context.Context, vendorID primitive.ObjectID) ([]models.Review, error) {
	var reviews []models.Review

	filter := bson.M{
		"vendor_id":   vendorID,
		"is_approved": true,
	}
	opts := options.Find().SetSort(bson.M{"created_at": -1})

	cursor, err := r.Collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var rev models.Review
		if err := cursor.Decode(&rev); err != nil {
			return nil, err
		}
		reviews = append(reviews, rev)
	}

	return reviews, nil
}

// GetAverageRating computes the average rating and count for a vendor using aggregation (includes all reviews).
func (r *MongoReviewRepository) GetAverageRating(ctx context.Context, vendorID primitive.ObjectID) (float64, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"vendor_id": vendorID}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$vendor_id",
			"avg":   bson.M{"$avg": "$rating"},
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.Collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err := cursor.All(ctx, &result); err != nil {
		return 0, 0, err
	}

	if len(result) == 0 {
		return 0, 0, nil
	}

	var avg float64
	if val, ok := result[0]["avg"].(float64); ok {
		avg = val
	}

	var count int64
	if val, ok := result[0]["count"].(int32); ok {
		count = int64(val)
	} else if val, ok := result[0]["count"].(int64); ok {
		count = val
	}

	return avg, count, nil
}

// GetApprovedAverageRating computes the average rating and count for a vendor using only approved reviews.
func (r *MongoReviewRepository) GetApprovedAverageRating(ctx context.Context, vendorID primitive.ObjectID) (float64, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"vendor_id":   vendorID,
			"is_approved": true,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$vendor_id",
			"avg":   bson.M{"$avg": "$rating"},
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.Collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err := cursor.All(ctx, &result); err != nil {
		return 0, 0, err
	}

	if len(result) == 0 {
		return 0, 0, nil
	}

	var avg float64
	if val, ok := result[0]["avg"].(float64); ok {
		avg = val
	}

	var count int64
	if val, ok := result[0]["count"].(int32); ok {
		count = int64(val)
	} else if val, ok := result[0]["count"].(int64); ok {
		count = val
	}

	return avg, count, nil
}

// UpdateApprovalStatus updates the approval status of a review.
func (r *MongoReviewRepository) UpdateApprovalStatus(ctx context.Context, reviewID primitive.ObjectID, isApproved bool) error {
	filter := bson.M{"_id": reviewID}
	update := bson.M{
		"$set": bson.M{
			"is_approved": isApproved,
			"updated_at":  time.Now(),
		},
	}

	result, err := r.Collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// FindByID retrieves a single review by its ID
func (r *MongoReviewRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Review, error) {
	var review models.Review
	err := r.Collection.FindOne(ctx, bson.M{"_id": id}).Decode(&review)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &review, err
}