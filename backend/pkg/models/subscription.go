// backend/pkg/models/subscription.go
package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Tier & Status enums
// ---------------------------------------------------------------------------

type SubscriptionTier string

const (
	TierFree     SubscriptionTier = "free"
	TierBasic    SubscriptionTier = "basic"
	TierPremium  SubscriptionTier = "premium"
	TierFeatured SubscriptionTier = "featured"
)

type SubscriptionStatus string

const (
	SubscriptionActive   SubscriptionStatus = "active"
	SubscriptionExpired  SubscriptionStatus = "expired"
	SubscriptionCanceled SubscriptionStatus = "canceled"
	SubscriptionPending  SubscriptionStatus = "pending"
)

// ---------------------------------------------------------------------------
// Tier ordinal ranking — lets us do simple tier comparisons
// ---------------------------------------------------------------------------

var tierOrder = map[SubscriptionTier]int{
	TierFree:     0,
	TierBasic:    1,
	TierPremium:  2,
	TierFeatured: 3,
}

// Rank returns the ordinal value of a tier.
// Usage: subscription.Tier.Rank() >= TierPremium.Rank()
func (t SubscriptionTier) Rank() int {
	if r, ok := tierOrder[t]; ok {
		return r
	}
	return 0
}

// ---------------------------------------------------------------------------
// Subscription Features — explicit struct instead of raw JSON
// ---------------------------------------------------------------------------

// SubscriptionFeatures defines the boolean feature flags a tier unlocks.
type SubscriptionFeatures struct {
	EnhancedProfile      bool `json:"enhancedProfile"`      // Basic+  — description, images, contact details surfaced
	BasicAnalytics       bool `json:"basicAnalytics"`       // Basic+  — profile views, inquiry count (30 days)
	RecentInquiries      bool `json:"recentInquiries"`      // Basic+  — list of recent inquiries
	PriorityListing      bool `json:"priorityListing"`      // Premium+ — boosted search ranking
	DetailedAnalytics    bool `json:"detailedAnalytics"`    // Premium+ — conversion rates, response time, avg rating
	RecentReviews        bool `json:"recentReviews"`        // Premium+ — list of recent reviews
	DirectMessagePriority bool `json:"directMessagePriority"` // Premium+ — receive inquiries first
	VerifiedBadge        bool `json:"verifiedBadge"`        // Premium+ — visible badge on listing
	FeaturedPlacement    bool `json:"featuredPlacement"`    // Featured — hero banner / sponsored section
	GoldBadge            bool `json:"goldBadge"`            // Featured — gold badge on listing
	CategoryBoost        bool `json:"categoryBoost"`        // Featured — boosted in category filters
	HomepageRotation     bool `json:"homepageRotation"`     // Featured — periodic homepage rotation
}

// tierFeatures maps each tier to its full feature set.
// Each tier includes everything below it.
var tierFeatures = map[SubscriptionTier]SubscriptionFeatures{
	TierFree: {},
	TierBasic: {
		EnhancedProfile: true,
		BasicAnalytics:  true,
		RecentInquiries: true,
	},
	TierPremium: {
		EnhancedProfile:       true,
		BasicAnalytics:        true,
		RecentInquiries:       true,
		PriorityListing:       true,
		DetailedAnalytics:     true,
		RecentReviews:         true,
		DirectMessagePriority: true,
		VerifiedBadge:         true,
	},
	TierFeatured: {
		EnhancedProfile:       true,
		BasicAnalytics:        true,
		RecentInquiries:       true,
		PriorityListing:       true,
		DetailedAnalytics:     true,
		RecentReviews:         true,
		DirectMessagePriority: true,
		VerifiedBadge:         true,
		FeaturedPlacement:     true,
		GoldBadge:             true,
		CategoryBoost:         true,
		HomepageRotation:      true,
	},
}

// GetFeatures returns the feature set for a given tier.
// Falls back to Free if the tier is unrecognised.
func GetFeatures(tier SubscriptionTier) SubscriptionFeatures {
	if f, ok := tierFeatures[tier]; ok {
		return f
	}
	return tierFeatures[TierFree]
}

// ---------------------------------------------------------------------------
// Tier pricing (in Kobo) — single source of truth
// ---------------------------------------------------------------------------

// TierPricing holds the min and max monthly price range for a tier in Kobo.
type TierPricing struct {
	MinKobo int64 `json:"minKobo"`
	MaxKobo int64 `json:"maxKobo"`
}

var tierPrices = map[SubscriptionTier]TierPricing{
	TierFree:     {MinKobo: 0, MaxKobo: 0},
	TierBasic:    {MinKobo: 200_000, MaxKobo: 350_000},   // ₦2,000 – ₦3,500
	TierPremium:  {MinKobo: 700_000, MaxKobo: 1_200_000}, // ₦7,000 – ₦12,000
	TierFeatured: {MinKobo: 1_800_000, MaxKobo: 2_500_000}, // ₦18,000 – ₦25,000
}

// GetPricing returns the price range for a given tier.
func GetPricing(tier SubscriptionTier) TierPricing {
	if p, ok := tierPrices[tier]; ok {
		return p
	}
	return TierPricing{}
}

// ---------------------------------------------------------------------------
// Subscription model — maps to the `subscriptions` table
// ---------------------------------------------------------------------------

type Subscription struct {
	ID               uuid.UUID          `json:"id" db:"id"`
	VendorID         uuid.UUID          `json:"vendorId" db:"vendor_id"`
	Tier             SubscriptionTier   `json:"tier" db:"tier"`
	Status           SubscriptionStatus `json:"status" db:"status"`
	StartsAt         time.Time          `json:"startsAt" db:"starts_at"`
	ExpiresAt        sql.NullTime       `json:"expiresAt" db:"expires_at"`
	AutoRenew        bool               `json:"autoRenew" db:"auto_renew"`
	Price            int64              `json:"price" db:"price"` // in Kobo
	Currency         string             `json:"currency" db:"currency"`
	PaymentReference sql.NullString     `json:"paymentReference" db:"payment_reference"`
	PaymentMethod    sql.NullString     `json:"paymentMethod" db:"payment_method"`
	LastPaymentDate  sql.NullTime       `json:"lastPaymentDate" db:"last_payment_date"`
	NextPaymentDate  sql.NullTime       `json:"nextPaymentDate" db:"next_payment_date"`
	CreatedAt        time.Time          `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time          `json:"updatedAt" db:"updated_at"`
}

// MarshalJSON cleans up sql.Null* fields to return simple values or null,
// consistent with the pattern used in vendor.go.
func (s Subscription) MarshalJSON() ([]byte, error) {
	type Alias Subscription

	cleanStr := func(ns sql.NullString) interface{} {
		if ns.Valid {
			return ns.String
		}
		return nil
	}
	cleanTime := func(nt sql.NullTime) interface{} {
		if nt.Valid {
			return nt.Time.Format(time.RFC3339)
		}
		return nil
	}

	return json.Marshal(&struct {
		ExpiresAt        interface{} `json:"expiresAt"`
		PaymentReference interface{} `json:"paymentReference"`
		PaymentMethod    interface{} `json:"paymentMethod"`
		LastPaymentDate  interface{} `json:"lastPaymentDate"`
		NextPaymentDate  interface{} `json:"nextPaymentDate"`
		Alias
	}{
		ExpiresAt:        cleanTime(s.ExpiresAt),
		PaymentReference: cleanStr(s.PaymentReference),
		PaymentMethod:    cleanStr(s.PaymentMethod),
		LastPaymentDate:  cleanTime(s.LastPaymentDate),
		NextPaymentDate:  cleanTime(s.NextPaymentDate),
		Alias:            (Alias)(s),
	})
}

// ---------------------------------------------------------------------------
// VendorWithSubscription — response struct that joins vendor + subscription
// ---------------------------------------------------------------------------

type VendorWithSubscription struct {
	Vendor       Vendor        `json:"vendor"`
	Subscription *Subscription `json:"subscription,omitempty"`
	Features     SubscriptionFeatures `json:"features"`
	IsFeatured   bool          `json:"isFeatured"`
	BadgeColor   string        `json:"badgeColor,omitempty"` // "gold", "silver", etc.
}

// ---------------------------------------------------------------------------
// VendorAnalyticsResponse — the single response struct returned by
// GetVendorAnalytics. Fields are pointers/slices so locked tiers return null.
// ---------------------------------------------------------------------------

// type VendorAnalyticsResponse struct {
// 	Tier         SubscriptionTier `json:"tier"`
// 	ProfileViews int              `json:"profileViews"`

// 	// Basic+
// 	InquiryCount    *int            `json:"inquiryCount"`    // nil if < Basic
// 	RecentInquiries []RecentInquiry `json:"recentInquiries"` // nil if < Basic

// 	// Premium+
// 	ReviewMetrics *ReviewMetricsRaw `json:"reviewMetrics"` // nil if < Premium
// 	AverageRating *float64          `json:"averageRating"` // nil if < Premium
// 	RecentReviews []RecentReview    `json:"recentReviews"` // nil if < Premium
// }