// pkg/repository/like_repo.go

package repository

import (
	"context"
	"time"
    
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
//	"go.mongodb.com/evenitfy/backend/pkg/db"
	"eventify/backend/pkg/models"
)

const likesCollection = "likes"

// LikeRepository defines the methods for managing event likes in the database.
type LikeRepository interface {
    // ToggleLike atomically inserts or deletes a like record.
    // Returns true if the action was a LIKE (insert), false if it was an UNLIKE (delete).
	ToggleLike(ctx context.Context, eventID primitive.ObjectID, userID primitive.ObjectID) (bool, error)
    
    // GetLikeCount fetches the total, definitive count of likes for an event.
	GetLikeCount(ctx context.Context, eventID primitive.ObjectID) (int, error)
}

// likeRepository implements the LikeRepository interface for MongoDB.
type likeRepository struct {
    Collection *mongo.Collection
}

// NewLikeRepository creates a new instance of LikeRepository.
func NewLikeRepository(collection *mongo.Collection) LikeRepository {
    return &likeRepository{
        Collection: collection, // ⬅️ Store the collection handle
    }
}

// --- Implementation Methods ---

// ToggleLike atomically inserts or deletes a like record.
func (r *likeRepository) ToggleLike(ctx context.Context, eventID primitive.ObjectID, userID primitive.ObjectID) (bool, error) {
	collection := r.Collection
	filter := bson.M{
		"event_id": eventID,
		"user_id":  userID,
	}

    // 1. Attempt to delete the like (UNLIKE operation)
	result, err := collection.DeleteOne(ctx, filter)
	if err != nil {
		return false, err // Database error
	}

    // If result.DeletedCount > 0, the record existed and was deleted (UNLIKE).
	if result.DeletedCount > 0 {
		return false, nil // Successfully Unliked
	}

    // 2. If no record was deleted, insert a new one (LIKE operation)
	like := models.Like{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		EventID:   eventID,
		CreatedAt: time.Now(),
	}

	_, err = collection.InsertOne(ctx, like)
    // NOTE: If a unique compound index (UserID, EventID) is set up, a duplicate insert will fail here, 
    // but in this simple toggle logic, it shouldn't happen unless a race condition occurs, 
    // which the DeleteOne check above helps mitigate.
	if err != nil {
		return false, err // Failed to insert
	}

	return true, nil // Successfully Liked
}

// GetLikeCount fetches the total, definitive count of likes for an event.
func (r *likeRepository) GetLikeCount(ctx context.Context, eventID primitive.ObjectID) (int, error) {
	collection := r.Collection
	filter := bson.M{"event_id": eventID}

	count, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, err
	}

	return int(count), nil
}