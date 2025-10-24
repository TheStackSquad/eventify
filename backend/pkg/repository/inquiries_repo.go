//backend/pkg/repository/inquiries_repo.go

package repository

import (
	"context"
	"errors"
	"time"

	"eventify/backend/pkg/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// InquiryRepository defines the contract for inquiry persistence operations.
type InquiryRepository interface {
	Create(ctx context.Context, inquiry *models.Inquiry) error
	GetByVendorID(ctx context.Context, vendorID primitive.ObjectID) ([]models.Inquiry, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.Inquiry, error)
	Delete(ctx context.Context, id primitive.ObjectID) error

	// FIX: Added the UpdateFields method signature to satisfy the Service Layer contract
	UpdateFields(ctx context.Context, id primitive.ObjectID, updates map[string]interface{}) error
}

// MongoInquiryRepository implements InquiryRepository with MongoDB.
type MongoInquiryRepository struct {
	Collection *mongo.Collection
}

// NewMongoInquiryRepository creates a new Mongo-based inquiry repo.
func NewMongoInquiryRepository(collection *mongo.Collection) *MongoInquiryRepository {
	return &MongoInquiryRepository{Collection: collection}
}

// Create inserts a new inquiry into the collection.
// NOTE: Renamed from CreateInquiry to Create to match the interface contract
func (r *MongoInquiryRepository) Create(ctx context.Context, inquiry *models.Inquiry) error {
	if inquiry == nil {
		return errors.New("inquiry is nil")
	}
	if inquiry.ID.IsZero() {
		inquiry.ID = primitive.NewObjectID()
	}
	now := time.Now()
	inquiry.CreatedAt = now
	inquiry.UpdatedAt = now

	_, err := r.Collection.InsertOne(ctx, inquiry)
	return err
}

// GetByVendorID fetches inquiries for a vendor.
// NOTE: Adjusted signature to match the interface contract
func (r *MongoInquiryRepository) GetByVendorID(ctx context.Context, vendorID primitive.ObjectID) ([]models.Inquiry, error) {
	// Original code here was designed to take a string and status, 
	// but the interface takes only ObjectID. We'll simplify this to match 
	// the interface and rely on the Service layer to handle string conversion.
	filter := bson.M{"vendor_id": vendorID}
	
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.Collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var inquiries []models.Inquiry
	if err := cursor.All(ctx, &inquiries); err != nil {
		return nil, err
	}

	return inquiries, nil
}

// FindByID fetches a single inquiry by its ID.
func (r *MongoInquiryRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Inquiry, error) {
	var inquiry models.Inquiry
	err := r.Collection.FindOne(ctx, bson.M{"_id": id}).Decode(&inquiry)
	if err == mongo.ErrNoDocuments {
		return nil, nil // Return nil, nil if not found
	}
	return &inquiry, err
}

// Delete removes an inquiry by its ID.
func (r *MongoInquiryRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	result, err := r.Collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return errors.New("inquiry not found for deletion")
	}
	return nil
}

// UpdateFields implements the InquiryRepository interface for partial updates.
// This generic method supports the status/response update from the service layer.
func (r *MongoInquiryRepository) UpdateFields(ctx context.Context, id primitive.ObjectID, updates map[string]interface{}) error {
	// Add the mandatory updated_at timestamp
	updates["updated_at"] = time.Now()
	
	updateDoc := bson.M{"$set": updates}
	
	result, err := r.Collection.UpdateByID(ctx, id, updateDoc)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("inquiry not found for update")
	}

	return nil
}

