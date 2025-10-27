// backend/pkg/repository/onboard_repo.go

package repository

import (
	"context"
	"eventify/backend/pkg/models"
	"time"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type FeedbackRepository interface {
	CreateFeedback(ctx context.Context, feedback *models.Feedback) error
	GetAllFeedback(ctx context.Context) ([]models.Feedback, error)
	GetFeedbackByID(ctx context.Context, id primitive.ObjectID) (*models.Feedback, error)
	DeleteFeedback(ctx context.Context, id primitive.ObjectID) error
}

type feedbackRepository struct {
	// The struct only needs the collection, not the full database
	collection *mongo.Collection
}

func NewFeedbackRepository(collection *mongo.Collection) FeedbackRepository { 
    return &feedbackRepository{
        collection: collection,
    }
}

func (r *feedbackRepository) CreateFeedback(ctx context.Context, feedback *models.Feedback) error {
	feedback.CreatedAt = time.Now()
	feedback.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, feedback)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create feedback")
		return err
	}

	feedback.ID = result.InsertedID.(primitive.ObjectID)
	log.Info().Str("feedback_id", feedback.ID.Hex()).Msg("Feedback created successfully")
	return nil
}

func (r *feedbackRepository) GetAllFeedback(ctx context.Context) ([]models.Feedback, error) {
	var feedbackList []models.Feedback

	// Sort by created_at descending (newest first)
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch feedback")
		return nil, err
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &feedbackList); err != nil {
		log.Error().Err(err).Msg("Failed to decode feedback")
		return nil, err
	}

	log.Info().Int("count", len(feedbackList)).Msg("Fetched all feedback")
	return feedbackList, nil
}

func (r *feedbackRepository) GetFeedbackByID(ctx context.Context, id primitive.ObjectID) (*models.Feedback, error) {
	var feedback models.Feedback

	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&feedback)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Warn().Str("feedback_id", id.Hex()).Msg("Feedback not found")
			return nil, err
		}
		log.Error().Err(err).Str("feedback_id", id.Hex()).Msg("Failed to fetch feedback")
		return nil, err
	}

	return &feedback, nil
}

func (r *feedbackRepository) DeleteFeedback(ctx context.Context, id primitive.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		log.Error().Err(err).Str("feedback_id", id.Hex()).Msg("Failed to delete feedback")
		return err
	}

	if result.DeletedCount == 0 {
		log.Warn().Str("feedback_id", id.Hex()).Msg("No feedback found to delete")
		return mongo.ErrNoDocuments
	}

	log.Info().Str("feedback_id", id.Hex()).Msg("Feedback deleted successfully")
	return nil
}