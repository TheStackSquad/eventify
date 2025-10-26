//backend/pkg/repository/auth_repo.go

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

// AuthRepository defines the contract for all user-related data operations needed
// for authentication, registration, and role checking.
type AuthRepository interface {
	// CRUD operations
	CreateUser(ctx context.Context, user *models.User) (primitive.ObjectID, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	SavePasswordResetToken(ctx context.Context, email, token string, expiry time.Time) error
	GetUserByResetToken(ctx context.Context, token string) (*models.User, error)
	UpdatePassword(ctx context.Context, userID primitive.ObjectID, hashedPassword string) error
	ClearPasswordResetToken(ctx context.Context, userID primitive.ObjectID) error

	// Authorization check for the middleware
	IsUserAdmin(ctx context.Context, id string) (bool, error)

}

// MongoAuthRepository implements the AuthRepository interface using a MongoDB collection.
type MongoAuthRepository struct {
	Collection *mongo.Collection
}

// NewMongoAuthRepository creates a new MongoAuthRepository instance,
func NewMongoAuthRepository(collection *mongo.Collection) *MongoAuthRepository {
	return &MongoAuthRepository{
		Collection: collection,
	}
}

// CreateUser inserts a new user document into the 'users' collection.
func (r *MongoAuthRepository) CreateUser(ctx context.Context, user *models.User) (primitive.ObjectID, error) {
	// Check for existing user with the same email
	existingUser, _ := r.GetUserByEmail(ctx, user.Email)
	if existingUser != nil {
		return primitive.NilObjectID, errors.New("user with this email already exists")
	}

	// Set audit fields and MongoDB ID
	if user.ID.IsZero() {
		user.ID = primitive.NewObjectID()
	}
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	result, err := r.Collection.InsertOne(ctx, user)
	if err != nil {
		return primitive.NilObjectID, err
	}

	return result.InsertedID.(primitive.ObjectID), nil
}

// GetUserByEmail retrieves a user document by their email address.
func (r *MongoAuthRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	filter := bson.M{"email": email}

	err := r.Collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByID retrieves a user document by their MongoDB ID.
func (r *MongoAuthRepository) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, errors.New("invalid user id format")
	}

	filter := bson.M{"_id": objID}

	err = r.Collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// SavePasswordResetToken stores the reset token and expiry for a user
func (r *MongoAuthRepository) SavePasswordResetToken(
	ctx context.Context, 
	email, token string, 
	expiry time.Time,
) error {
	filter := bson.M{"email": email}
	update := bson.M{
		"$set": bson.M{
			"reset_token":        token,
			"reset_token_expiry": expiry,
			"updated_at":         time.Now(),
		},
	}
	
	result, err := r.Collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}
	
	if result.MatchedCount == 0 {
		return errors.New("user not found")
	}
	
	return nil
}

// GetUserByResetToken retrieves a user by their reset token
func (r *MongoAuthRepository) GetUserByResetToken(
	ctx context.Context, 
	token string,
) (*models.User, error) {
	var user models.User
	
	// Token must exist, match, and not be expired
	filter := bson.M{
		"reset_token": token,
		"reset_token_expiry": bson.M{"$gt": time.Now()},
	}
	
	err := r.Collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("invalid or expired reset token")
		}
		return nil, err
	}
	
	return &user, nil
}

// UpdatePassword updates a user's password
func (r *MongoAuthRepository) UpdatePassword(
	ctx context.Context, 
	userID primitive.ObjectID, 
	hashedPassword string,
) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$set": bson.M{
			"password":   hashedPassword,
			"updated_at": time.Now(),
		},
	}
	
	result, err := r.Collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}
	
	if result.MatchedCount == 0 {
		return errors.New("user not found")
	}
	
	return nil
}

// ClearPasswordResetToken removes reset token fields after successful reset
func (r *MongoAuthRepository) ClearPasswordResetToken(
	ctx context.Context, 
	userID primitive.ObjectID,
) error {
	filter := bson.M{"_id": userID}
	update := bson.M{
		"$unset": bson.M{
			"reset_token":        "",
			"reset_token_expiry": "",
		},
		"$set": bson.M{
			"updated_at": time.Now(),
		},
	}
	
	_, err := r.Collection.UpdateOne(ctx, filter, update)
	return err
}

// IsUserAdmin checks the database to see if the user has the IsAdmin flag set.
func (r *MongoAuthRepository) IsUserAdmin(ctx context.Context, id string) (bool, error) {
	// We only retrieve the IsAdmin field for efficiency
	var result struct {
		IsAdmin bool `bson:"is_admin"`
	}

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, errors.New("invalid user id format")
	}

	filter := bson.M{"_id": objID}
	// Projection to only retrieve the 'is_admin' field
	projection := bson.D{{Key: "is_admin", Value: 1}}
	opts := options.FindOne().SetProjection(projection)

	err = r.Collection.FindOne(ctx, filter, opts).Decode(&result)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			// This explicitly handles the "user not found" case in the middleware
			return false, errors.New("user not found")
		}
		return false, err
	}

	return result.IsAdmin, nil
}
