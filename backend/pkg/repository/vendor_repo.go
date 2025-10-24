//backend/pkg/repository/vendor_repo.

package repository

import (
	"context"
	"errors"
	"strconv"
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
	UpdateVerificationFlag(ctx context.Context, id string, field string, isVerified bool, reason string) error
	UpdatePVSScore(ctx context.Context, id string, score int) error
	Delete(ctx context.Context, id string) (int64, error)
	// Write operations - General Update
	UpdateFields(ctx context.Context, id string, updates map[string]interface{}) error // <-- REQUIRED METHOD
	IncrementField(ctx context.Context, id primitive.ObjectID, field string, delta int) error

	// Read operations
	GetByID(ctx context.Context, id string) (models.Vendor, error)
	FindPublicVendors(ctx context.Context, filters map[string]interface{}) ([]models.Vendor, error)
}


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

// Create implements the VendorRepository interface, inserting a new vendor document.
func (r *MongoVendorRepository) Create(ctx context.Context, vendor *models.Vendor) (primitive.ObjectID, error) {
	if vendor == nil {
		return primitive.NilObjectID, errors.New("vendor is nil")
	}

	// Set timestamps and ID if not already set (good practice)
	now := time.Now()
	if vendor.ID.IsZero() {
		vendor.ID = primitive.NewObjectID()
	}
	vendor.CreatedAt = now
	vendor.UpdatedAt = now
	
	// Insert the document
	result, err := r.Collection.InsertOne(ctx, vendor)
	if err != nil {
		return primitive.NilObjectID, err
	}
	
	// Return the newly created ID
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		return oid, nil
	}
	
	return primitive.NilObjectID, errors.New("failed to retrieve inserted object ID")
}

// IncrementField increments or decrements a numerical field in the vendor document.
func (r *MongoVendorRepository) IncrementField(ctx context.Context, id primitive.ObjectID, field string, delta int) error {
	update := bson.M{
		"$inc": bson.M{field: delta},
		"$set": bson.M{"updated_at": time.Now()},
	}

	result, err := r.Collection.UpdateByID(ctx, id, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("vendor not found")
	}
	return nil
}

// UpdateFields performs a partial update on a vendor document using a map of fields.
// This implements the missing method required by the VendorRepository interface.
func (r *MongoVendorRepository) UpdateFields(ctx context.Context, id string, updates map[string]interface{}) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid id format")
	}

	// 1. Prepare the update document
	setUpdates := bson.M{}
	
	// Copy all fields from the input map to the $set operator
	for k, v := range updates {
		setUpdates[k] = v
	}

	// Always update the timestamp
	setUpdates["updated_at"] = time.Now()

	// Create the final BSON update query
	updateDoc := bson.M{"$set": setUpdates}

	// 2. Perform the update
	result, err := r.Collection.UpdateByID(ctx, objID, updateDoc)
	if err != nil {
		return err
	}

	if result.ModifiedCount == 0 && result.UpsertedCount == 0 {
		return errors.New("vendor not found or no changes made")
	}

	return nil
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
			field: isVerified,
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
			"pvs_score": score,
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

// FindPublicVendors method
func (r *MongoVendorRepository) FindPublicVendors(ctx context.Context, filters map[string]interface{}) ([]models.Vendor, error) {
	var vendors []models.Vendor

	// Start with a list of filters (BSON M's).
	mongoFilters := []bson.M{}

	// 1. NEW: Flexible Visibility Rule - Show all vendors but prioritize verified ones
	// Remove the strict $or condition that was hiding unverified vendors
	// All vendors are now publicly visible by default
	
	// 2. Apply user-supplied filters (state, category, etc.)
	for key, value := range filters {
		// Handle different filter types
		switch key {
		case "min_price":
			// Convert string to integer for numeric comparison
			if valStr, ok := value.(string); ok && valStr != "" {
				if minPrice, err := strconv.Atoi(valStr); err == nil {
					mongoFilters = append(mongoFilters, bson.M{"min_price": bson.M{"$gte": minPrice}})
				}
			}
		case "category", "state", "city", "area":
			// Only apply non-empty string filters
			if valStr, ok := value.(string); ok && valStr != "" {
				mongoFilters = append(mongoFilters, bson.M{key: valStr})
			}
		case "is_verified": 
			// Allow filtering by verification status if explicitly requested
			if isVerified, ok := value.(bool); ok {
				mongoFilters = append(mongoFilters, bson.M{"is_identity_verified": isVerified})
			}
		}
	}

	// 3. Combine all filters (if any)
	finalFilter := bson.M{}
	if len(mongoFilters) > 0 {
		finalFilter = bson.M{"$and": mongoFilters}
	}

	// 4. NEW: Enhanced sorting - prioritize verified vendors, then by PVS score
	opts := options.Find().SetSort(bson.D{
		{Key: "is_business_registered", Value: -1},
		{Key: "is_identity_verified", Value: -1},
		{Key: "pvs_score", Value: -1},
		{Key: "created_at", Value: -1},
	})

	// 5. Execute the query
	cursor, err := r.Collection.Find(ctx, finalFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	// 6. Decode results
	if err = cursor.All(ctx, &vendors); err != nil {
		return nil, err
	}

	return vendors, nil
}
