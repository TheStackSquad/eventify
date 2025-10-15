// backend/pkg/models/vendor.go

package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Vendor represents a service provider entity on the Eventify platform.
type Vendor struct {
	// --- Core Identification and Display Fields ---
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name             string             `bson:"name" json:"name" binding:"required"` 
	Category         string             `bson:"category" json:"category" binding:"required"`
	SubCategories    []string           `bson:"sub_categories" json:"subCategories"`
	ImageURL         string             `bson:"image_url" json:"imageURL"` 

	// --- Location and Contact Fields ---
	State            string             `bson:"state" json:"state" binding:"required"`
	City             string             `bson:"city" json:"city"`
	Area             string             `bson:"area" json:"area"`
	PhoneNumber      string             `bson:"phone_number" json:"phoneNumber"`
	MinPrice         int                `bson:"min_price" json:"minPrice"`

	
	// --- Presentation and Scoring Fields ---
	PVSScore         int                `bson:"pvs_score" json:"pvsScore"`
	ReviewCount      int                `bson:"review_count" json:"reviewCount"`
	
	// --- Internal PVS Calculation Fields ---
	IsIdentityVerified bool               `bson:"is_identity_verified" json:"isIdentityVerified"`
	IsBusinessRegistered bool             `bson:"is_business_registered" json:"isBusinessRegistered"` 
	ProfileCompletion  float32            `bson:"profile_completion" json:"-"`
	InquiryCount     int                `bson:"inquiry_count" json:"-"`
	RespondedCount   int                `bson:"responded_count" json:"-"`
	BookingsCompleted int               `bson:"bookings_completed" json:"bookingsCompleted"`
	
	// --- Audit Fields ---
	CreatedAt        time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt        time.Time          `bson:"updated_at" json:"updatedAt"`
}