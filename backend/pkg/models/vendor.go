//backend/pkg/models/vendor.go

package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Vendor represents a service provider entity on the Eventify platform.
// It includes core display data and internal fields for PVS scoring.
type Vendor struct {
	// --- Core Identification and Display Fields ---
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Name              string             `bson:"name" json:"name" binding:"required"`
	Category          string             `bson:"category" json:"category" binding:"required"`
	SubCategories     []string           `bson:"sub_categories" json:"subCategories"`
	ImageURL          string             `bson:"image_url" json:"imageURL"`

	// --- Location and Contact Fields (Nigerian Specific) ---
	State             string             `bson:"state" json:"state" binding:"required"` // e.g., Lagos, Abuja FCT
	City              string             `bson:"city" json:"city"`                    // e.g., Ikeja, Wuse 2
	Area              string             `bson:"area" json:"area"`                    // Specific neighborhood/LGA
	PhoneNumber       string             `bson:"phone_number" json:"phoneNumber"`
	MinPrice          int                `bson:"min_price" json:"minPrice"`           // Starting price in NGN

	// --- Presentation and Scoring Fields ---
	// PVSScore is the final calculated score (0-100) shown to users.
	PVSScore          int                `bson:"pvs_score" json:"pvsScore"`
	ReviewCount       int                `bson:"review_count" json:"reviewCount"`     // Still useful for showing engagement

	// --- Internal PVS Calculation Fields (Not always exposed via JSON) ---
	IsIdentityVerified bool               `bson:"is_identity_verified" json:"isIdentityVerified"`
	IsBusinessRegistered bool             `bson:"is_business_registered" json:"isBusinessRegistered"` // CAC verification
	ProfileCompletion   float32            `bson:"profile_completion" json:"-"`                      // Percentage (0.0 to 1.0)
	InquiryCount      int                `bson:"inquiry_count" json:"-"`                           // Total inquiries received
	RespondedCount    int                `bson:"responded_count" json:"-"`                         // Total inquiries responded to
	BookingsCompleted int                `bson:"bookings_completed" json:"bookingsCompleted"`        // Successful bookings via platform

	// --- Audit Fields ---
	CreatedAt         time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt         time.Time          `bson:"updated_at" json:"updatedAt"`
}
