// backend/pkg/models/refresh_token.go
package models

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Step 1: RefreshToken model for database storage
type RefreshToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    string             `bson:"user_id" json:"user_id"`
	TokenHash string             `bson:"token_hash" json:"token_hash"` // Store hash, not raw token
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	Revoked   bool               `bson:"revoked" json:"revoked"` // For manual revocation
}

// Step 2: RefreshTokenService handles database operations for refresh tokens
type RefreshTokenService struct {
	collection *mongo.Collection
}

// Step 3: Create new service instance
func NewRefreshTokenService(db *mongo.Database) *RefreshTokenService {
	return &RefreshTokenService{
		collection: db.Collection("refresh_tokens"),
	}
}

// Step 4: Hash token for secure storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// Step 5: Save refresh token to database
func (s *RefreshTokenService) SaveRefreshToken(ctx context.Context, userID, token string, maxAge int) error {
	tokenHash := hashToken(token)
	expiresAt := time.Now().Add(time.Duration(maxAge) * time.Second)

	refreshToken := RefreshToken{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
		Revoked:   false,
	}

	_, err := s.collection.InsertOne(ctx, refreshToken)
	if err != nil {
		log.Error().Err(err).Msg("Failed to save refresh token")
		return err
	}

	log.Info().Str("user_id", userID).Msg("Refresh token saved successfully")
	return nil
}

// Step 6: Validate refresh token against database
func (s *RefreshTokenService) ValidateRefreshToken(ctx context.Context, userID, token string) (bool, error) {
	tokenHash := hashToken(token)

	// Find token in database
	filter := bson.M{
		"user_id":    userID,
		"token_hash": tokenHash,
		"revoked":    false,
		"expires_at": bson.M{"$gt": time.Now()}, // Not expired
	}

	var refreshToken RefreshToken
	err := s.collection.FindOne(ctx, filter).Decode(&refreshToken)

	if err == mongo.ErrNoDocuments {
		log.Warn().Str("user_id", userID).Msg("Refresh token not found or expired")
		return false, nil
	} else if err != nil {
		log.Error().Err(err).Msg("Error validating refresh token")
		return false, err
	}

	return true, nil
}

// Step 7: Revoke refresh token (for logout)
func (s *RefreshTokenService) RevokeRefreshToken(ctx context.Context, userID, token string) error {
	tokenHash := hashToken(token)

	// Mark token as revoked
	filter := bson.M{
		"user_id":    userID,
		"token_hash": tokenHash,
	}

	update := bson.M{
		"$set": bson.M{
			"revoked": true,
		},
	}

	result, err := s.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		log.Error().Err(err).Msg("Failed to revoke refresh token")
		return err
	}

	if result.ModifiedCount == 0 {
		log.Warn().Str("user_id", userID).Msg("No refresh token found to revoke")
	} else {
		log.Info().Str("user_id", userID).Msg("Refresh token revoked successfully")
	}

	return nil
}

// Step 8: Clean up expired tokens (run periodically)
func (s *RefreshTokenService) CleanupExpiredTokens(ctx context.Context) error {
	filter := bson.M{
		"expires_at": bson.M{"$lt": time.Now()},
	}

	result, err := s.collection.DeleteMany(ctx, filter)
	if err != nil {
		log.Error().Err(err).Msg("Failed to cleanup expired tokens")
		return err
	}

	if result.DeletedCount > 0 {
		log.Info().Int64("count", result.DeletedCount).Msg("Expired tokens cleaned up")
	}

	return nil
}

// Step 9: Revoke all tokens for a user (useful for "logout from all devices")
func (s *RefreshTokenService) RevokeAllUserTokens(ctx context.Context, userID string) error {
	filter := bson.M{"user_id": userID}
	update := bson.M{"$set": bson.M{"revoked": true}}

	result, err := s.collection.UpdateMany(ctx, filter, update)
	if err != nil {
		log.Error().Err(err).Msg("Failed to revoke all user tokens")
		return err
	}

	log.Info().Str("user_id", userID).Int64("count", result.ModifiedCount).Msg("All user tokens revoked")
	return nil
}