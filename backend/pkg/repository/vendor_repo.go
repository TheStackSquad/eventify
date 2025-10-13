//backend/pkg/repository/vendor_repo.go

package repository

import (
	"context"
	"errors"
	"time"

	"eventify/backend/pkg/models" // Assumed path based on your structure

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// VendorRepository defines the contract for all data operations related to Vendor entities.
// Handlers rely solely on this interface, not the concrete MongoDB implementation.
type VendorRepository interface {
	// Write operations
	Create(ctx context.Context, vendor *models.Vendor) (primitive.ObjectID, error)
	// NOTE: We keep the ID as string here to match the handler's request parameter source,
	// but convert it immediately inside the method for safety.
	UpdateVerificationFlag(ctx context.Context, id string, field string, isVerified bool, reason string) error
	UpdatePVSScore(ctx context.Context, id string, score int) error
	Delete(ctx context.Context, id string) (int64, error) // Returns count of deleted documents

	// Read operations
	GetByID(ctx context.Context, id string) (models.Vendor, error)
	FindPublicVendors(ctx context.Context, filters map[string]interface{}) ([]models.Vendor, error)
}

// --------------------------------------------------------------------------------------
// CONCRETE IMPLEMENTATION: MongoVendorRepository
// --------------------------------------------------------------------------------------

// MongoVendorRepository implements the VendorRepository interface using a MongoDB collection.
type MongoVendorRepository struct {
	Collection *mongo.Collection
}

// NewMongoVendorRepository creates a new MongoVendorRepository instance,
// injecting the required MongoDB collection handle.
func NewMongoVendorRepository(collection *mongo.Collection) *MongoVendorRepository {
	return &MongoVendorRepository{
		Collection: collection,
	}
}

// Create inserts a new vendor document into the database.
func (r *MongoVendorRepository) Create(ctx context.Context, vendor *models.Vendor) (primitive.ObjectID, error) {
	// 1. Set audit fields and MongoDB ID
	if vendor.ID.IsZero() {
		vendor.ID = primitive.NewObjectID()
	}
	now := time.Now()
	vendor.CreatedAt = now
	vendor.UpdatedAt = now

	// 2. Perform the insert operation
	result, err := r.Collection.InsertOne(ctx, vendor)
	if err != nil {
		return primitive.NilObjectID, err
	}

	// 3. Return the inserted ID
	return result.InsertedID.(primitive.ObjectID), nil
}

// GetByID retrieves a single vendor document by its string ID.
func (r *MongoVendorRepository) GetByID(ctx context.Context, id string) (models.Vendor, error) {
	var vendor models.Vendor

	// 1. Convert string ID to MongoDB ObjectID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		// Return a distinct error type if the ID format is bad.
		return models.Vendor{}, errors.New("invalid id format")
	}

	// 2. Define filter and perform query
	filter := bson.M{"_id": objID}
	err = r.Collection.FindOne(ctx, filter).Decode(&vendor)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			// Explicitly handle "Not Found" case, allowing the handler to return 404
			return models.Vendor{}, errors.New("vendor not found")
		}
		// Handle other internal errors
		return models.Vendor{}, err
	}

	return vendor, nil
}

// UpdateVerificationFlag dynamically updates a boolean flag field (e.g., is_identity_verified) and the audit time.
// The 'reason' field is currently unused in the update, as it is primarily for admin logging/communication.
func (r *MongoVendorRepository) UpdateVerificationFlag(ctx context.Context, id string, field string, isVerified bool, reason string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid id format")
	}

	// Dynamic BSON update document. We use primitive.M for flexible updates.
	update := bson.M{
		"$set": bson.M{
			field:       isVerified,
			"updated_at": time.Now(),
		},
	}

	result, err := r.Collection.UpdateByID(ctx, objID, update)
	if err != nil {
		return err
	}

	if result.ModifiedCount == 0 && result.UpsertedCount == 0 {
		return errors.New("vendor not found or no change made")
	}

	return nil
}

// UpdatePVSScore updates the vendor's calculated PVS score and audit time.
func (r *MongoVendorRepository) UpdatePVSScore(ctx context.Context, id string, score int) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid id format")
	}

	update := bson.M{
		"$set": bson.M{
			"pvs_score":  score,
			"updated_at": time.Now(),
		},
	}

	result, err := r.Collection.UpdateByID(ctx, objID, update)
	if err != nil {
		return err
	}

	if result.ModifiedCount == 0 {
		return errors.New("vendor not found or score already set")
	}

	return nil
}

// Delete permanently removes a vendor document.
func (r *MongoVendorRepository) Delete(ctx context.Context, id string) (int64, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return 0, errors.New("invalid id format")
	}

	filter := bson.M{"_id": objID}
	result, err := r.Collection.DeleteOne(ctx, filter)
	if err != nil {
		return 0, err
	}

	return result.DeletedCount, nil
}

// FindPublicVendors retrieves vendors based on filter criteria, ensuring they meet public visibility standards.
func (r *MongoVendorRepository) FindPublicVendors(ctx context.Context, filters map[string]interface{}) ([]models.Vendor, error) {
	var vendors []models.Vendor

	// Start with a list of filters (BSON M's).
	mongoFilters := []bson.M{}

	// 1. Enforce Public Visibility Rule (PVSScore >= 40 OR IsBusinessRegistered=true)
	// This ensures only quality or verified vendors are listed publicly.
	visibilityCriteria := bson.M{
		"$or": []bson.M{
			{"pvs_score": bson.M{"$gte": 40}}, // High enough PVS Score
			{"is_business_registered": true},  // CAC verified
		},
	}
	mongoFilters = append(mongoFilters, visibilityCriteria)

	// 2. Apply user-supplied filters (state, category, etc.)
	for key, value := range filters {
		// Only apply non-empty string filters
		if valStr, ok := value.(string); ok && valStr != "" {
			mongoFilters = append(mongoFilters, bson.M{key: valStr})
		}
	}

	// 3. Combine all filters using $and
	finalFilter := bson.M{}
	if len(mongoFilters) > 0 {
		finalFilter = bson.M{"$and": mongoFilters}
	}

	// Optional: Sort results by PVS score descending
	opts := options.Find().SetSort(bson.D{{Key: "pvs_score", Value: -1}})

	// 4. Execute the query
	cursor, err := r.Collection.Find(ctx, finalFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	// 5. Decode results
	if err = cursor.All(ctx, &vendors); err != nil {
		return nil, err
	}

	return vendors, nil
}
