//backend/pkg/repository/reviews_repo.

//backend/pkg/repository/reviews_repo.go
package repository

import (
	"context"
	"time"

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
	GetApprovedByVendorID(ctx context.Context, vendorID primitive.ObjectID) ([]models.Review, error) // New method for approved reviews only
	GetAverageRating(ctx context.Context, vendorID primitive.ObjectID) (float64, int64, error)
	GetApprovedAverageRating(ctx context.Context, vendorID primitive.ObjectID) (float64, int64, error) // New method for approved reviews only
	UpdateApprovalStatus(ctx context.Context, reviewID primitive.ObjectID, isApproved bool) error // New method for moderation
}

// MongoReviewRepository implements the ReviewRepository interface using a MongoDB collection.
type MongoReviewRepository struct {
	Collection *mongo.Collection
}

// NewMongoReviewRepository creates a new repository instance, accepting a *mongo.Collection.
// NOTE: Renamed for consistency and updated to accept *mongo.Collection to fix main.go error.
func NewMongoReviewRepository(collection *mongo.Collection) *MongoReviewRepository {
	return &MongoReviewRepository{
		Collection: collection,
	}
}

// Create inserts a new review document or updates an existing one from the same user/IP.
func (r *MongoReviewRepository) Create(ctx context.Context, review *models.Review) error {
	review.UpdatedAt = time.Now()
	review.CreatedAt = time.Now()
	
	// Set default approval status (false for moderation)
	review.IsApproved = false

	// If no ID provided, generate one
	if review.ID.IsZero() {
		review.ID = primitive.NewObjectID()
	}

	// Build unique filter for existing review (by user_id)
	filter := bson.M{
		"vendor_id": review.VendorID,
		"user_id":   review.UserID,
	}

	// Update existing review or insert new one
	update := bson.M{
		"$set": bson.M{
			"rating":       review.Rating,
			"comment":      review.Comment,
			"updated_at":   review.UpdatedAt,
			"is_approved":  review.IsApproved,
		},
		"$setOnInsert": bson.M{
			"_id":         review.ID,
			"created_at":  review.CreatedAt,
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
	opts := options.Find().SetSort(bson.M{"created_at": -1}) // Sort by newest first
	
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
	opts := options.Find().SetSort(bson.M{"created_at": -1}) // Sort by newest first
	
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

	// Safely extract float64 and convert int32 to int64
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

	// Safely extract float64 and convert int32 to int64
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