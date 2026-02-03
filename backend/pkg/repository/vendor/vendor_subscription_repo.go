// backend/pkg/repository/vendor/vendor_subscription_repo.go
package vendor

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/eventify/backend/pkg/models"
	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

// LEFT JOIN so we always get the vendor row even if no subscription exists.
// Subscription columns are aliased with the sub_ prefix to avoid clashing
// with vendor columns that share the same name (id, created_at, updated_at).
// We ORDER BY sub.created_at DESC so the most recent subscription wins
// when a vendor has historical rows.
const getVendorWithSubscriptionQuery = `
	SELECT
		v.id,
		v.owner_id,
		v.name,
		v.category,
		v.image_url,
		v.status,
		v.is_identity_verified,
		v.is_business_registered,
		v.state,
		v.city,
		v.phone_number,
		v.min_price,
		v.pvs_score,
		v.review_count,
		v.profile_completion,
		v.inquiry_count,
		v.responded_count,
		v.created_at,
		v.updated_at,
		v.vnin,
		v.first_name,
		v.middle_name,
		v.last_name,
		v.date_of_birth,
		v.gender,
		v.description,
		v.email,
		v.cac_number,
		v.is_business_verified,

		s.id                AS sub_id,
		s.vendor_id         AS sub_vendor_id,
		s.tier              AS sub_tier,
		s.status            AS sub_status,
		s.starts_at         AS sub_starts_at,
		s.expires_at        AS sub_expires_at,
		s.auto_renew        AS sub_auto_renew,
		s.price             AS sub_price,
		s.currency          AS sub_currency,
		s.payment_reference AS sub_payment_reference,
		s.payment_method    AS sub_payment_method,
		s.last_payment_date AS sub_last_payment_date,
		s.next_payment_date AS sub_next_payment_date,
		s.created_at        AS sub_created_at,
		s.updated_at        AS sub_updated_at
	FROM vendors v
	LEFT JOIN subscriptions s ON s.vendor_id = v.id
	WHERE v.id = $1
	ORDER BY s.created_at DESC
	LIMIT 1
`

// ---------------------------------------------------------------------------
// Flat scan target
// ---------------------------------------------------------------------------

// vendorWithSubscriptionRow is the flat struct sqlx scans into.
// All subscription fields are nullable because the LEFT JOIN may produce NULLs.
type vendorWithSubscriptionRow struct {
	// --- vendor columns (map 1:1 to models.Vendor db tags) ---
	ID                   uuid.UUID      `db:"id"`
	OwnerID              uuid.UUID      `db:"owner_id"`
	Name                 string         `db:"name"`
	Category             string         `db:"category"`
	ImageURL             sql.NullString `db:"image_url"`
	Status               string         `db:"status"`
	IsIdentityVerified   bool           `db:"is_identity_verified"`
	IsBusinessRegistered bool           `db:"is_business_registered"`
	State                string         `db:"state"`
	City                 sql.NullString `db:"city"`
	PhoneNumber          sql.NullString `db:"phone_number"`
	MinPrice             sql.NullInt32  `db:"min_price"`
	PVSScore             int32          `db:"pvs_score"`
	ReviewCount          int32          `db:"review_count"`
	ProfileCompletion    float32        `db:"profile_completion"`
	InquiryCount         int32          `db:"inquiry_count"`
	RespondedCount       int32          `db:"responded_count"`
	CreatedAt            time.Time      `db:"created_at"`
	UpdatedAt            time.Time      `db:"updated_at"`
	VNIN                 sql.NullString `db:"vnin"`
	FirstName            sql.NullString `db:"first_name"`
	MiddleName           sql.NullString `db:"middle_name"`
	LastName             sql.NullString `db:"last_name"`
	DateOfBirth          sql.NullTime   `db:"date_of_birth"`
	Gender               sql.NullString `db:"gender"`
	Description          sql.NullString `db:"description"`
	Email                sql.NullString `db:"email"`
	CACNumber            sql.NullString `db:"cac_number"`
	IsBusinessVerified   sql.NullBool   `db:"is_business_verified"`

	// --- subscription columns (all nullable, prefixed sub_) ---
	SubID              *uuid.UUID         `db:"sub_id"`
	SubVendorID        *uuid.UUID         `db:"sub_vendor_id"`
	SubTier            *string            `db:"sub_tier"`
	SubStatus          *string            `db:"sub_status"`
	SubStartsAt        *time.Time         `db:"sub_starts_at"`
	SubExpiresAt       sql.NullTime       `db:"sub_expires_at"`
	SubAutoRenew       *bool              `db:"sub_auto_renew"`
	SubPrice           *int64             `db:"sub_price"`
	SubCurrency        *string            `db:"sub_currency"`
	SubPaymentRef      sql.NullString     `db:"sub_payment_reference"`
	SubPaymentMethod   sql.NullString     `db:"sub_payment_method"`
	SubLastPaymentDate sql.NullTime       `db:"sub_last_payment_date"`
	SubNextPaymentDate sql.NullTime       `db:"sub_next_payment_date"`
	SubCreatedAt       *time.Time         `db:"sub_created_at"`
	SubUpdatedAt       *time.Time         `db:"sub_updated_at"`
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

func (r *PostgresVendorRepository) GetVendorWithSubscription(ctx context.Context, vendorID uuid.UUID) (*models.VendorWithSubscription, error) {
	var row vendorWithSubscriptionRow

	err := r.DB.GetContext(ctx, &row, getVendorWithSubscriptionQuery, vendorID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("vendor not found")
		}
		return nil, fmt.Errorf("failed to get vendor with subscription: %w", err)
	}

	result := assembleVendorWithSubscription(&row)
	return result, nil
}

// ---------------------------------------------------------------------------
// Assembly helpers
// ---------------------------------------------------------------------------

// assembleVendorWithSubscription maps the flat scan row into the nested
// VendorWithSubscription response. If no subscription row was joined
// (SubID is nil), Subscription stays nil and tier defaults to Free.
func assembleVendorWithSubscription(row *vendorWithSubscriptionRow) *models.VendorWithSubscription {
	vendor := models.Vendor{
		ID:                   row.ID,
		OwnerID:              row.OwnerID,
		Name:                 row.Name,
		Category:             row.Category,
		ImageURL:             row.ImageURL,
		Status:               models.VendorStatus(row.Status),
		IsIdentityVerified:   row.IsIdentityVerified,
		IsBusinessRegistered: row.IsBusinessRegistered,
		State:                row.State,
		City:                 row.City,
		PhoneNumber:          row.PhoneNumber,
		MinPrice:             row.MinPrice,
		PVSScore:             row.PVSScore,
		ReviewCount:          row.ReviewCount,
		ProfileCompletion:    row.ProfileCompletion,
		InquiryCount:         row.InquiryCount,
		RespondedCount:       row.RespondedCount,
		CreatedAt:            row.CreatedAt,
		UpdatedAt:            row.UpdatedAt,
		VNIN:                 row.VNIN,
		FirstName:            row.FirstName,
		MiddleName:           row.MiddleName,
		LastName:             row.LastName,
		DateOfBirth:          row.DateOfBirth,
		Gender:               row.Gender,
		Description:          row.Description,
		Email:                row.Email,
		CACNumber:            row.CACNumber,
		IsBusinessVerified:   row.IsBusinessVerified,
	}

	result := &models.VendorWithSubscription{
		Vendor: vendor,
	}

	// No subscription row joined — default to Free
	if row.SubID == nil {
		result.Features = models.GetFeatures(models.TierFree)
		return result
	}

	// Subscription exists — assemble it
	tier := models.SubscriptionTier(*row.SubTier)

	sub := &models.Subscription{
		ID:               *row.SubID,
		VendorID:         *row.SubVendorID,
		Tier:             tier,
		Status:           models.SubscriptionStatus(*row.SubStatus),
		StartsAt:         *row.SubStartsAt,
		ExpiresAt:        row.SubExpiresAt,
		AutoRenew:        *row.SubAutoRenew,
		Price:            *row.SubPrice,
		Currency:         *row.SubCurrency,
		PaymentReference: row.SubPaymentRef,
		PaymentMethod:    row.SubPaymentMethod,
		LastPaymentDate:  row.SubLastPaymentDate,
		NextPaymentDate:  row.SubNextPaymentDate,
		CreatedAt:        *row.SubCreatedAt,
		UpdatedAt:        *row.SubUpdatedAt,
	}

	result.Subscription = sub
	result.Features = models.GetFeatures(tier)
	result.IsFeatured = tier == models.TierFeatured && sub.Status == models.SubscriptionActive
	result.BadgeColor = resolveBadgeColor(tier, sub.Status)

	return result
}

// resolveBadgeColor returns the badge color based on tier and active status.
// Returns empty string if the subscription is not active or tier doesn't warrant a badge.
func resolveBadgeColor(tier models.SubscriptionTier, status models.SubscriptionStatus) string {
	if status != models.SubscriptionActive {
		return ""
	}

	switch tier {
	case models.TierFeatured:
		return "gold"
	case models.TierPremium:
		return "silver"
	case models.TierBasic:
		return "bronze"
	default:
		return ""
	}
}