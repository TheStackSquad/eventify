// backend/pkg/models/like.go

package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Like struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
    
	// IDs of the entities being linked
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	EventID   primitive.ObjectID `bson:"event_id" json:"event_id"`
    
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}