// backend/pkg/models/vendor.go
package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type VendorStatus string

const (
    VendorStatusActive    VendorStatus = "active"
    VendorStatusSuspended VendorStatus = "suspended"
    VendorStatusDeleted   VendorStatus = "deleted" 
)

// MarshalJSON ensures MinPrice and NullStrings return simple values or null to the frontend
func (v Vendor) MarshalJSON() ([]byte, error) {
    type Alias Vendor

    cleanStr := func(ns sql.NullString) interface{} {
        if ns.Valid { return ns.String }
        return nil
    }
    cleanInt32 := func(ni sql.NullInt32) interface{} {
        if ni.Valid { return ni.Int32 }
        return nil
    }
    cleanTime := func(nt sql.NullTime) interface{} {
        if nt.Valid { return nt.Time.Format("2006-01-02") }
        return nil
    }
    cleanBool := func(nb sql.NullBool) interface{} {
        if nb.Valid { return nb.Bool }
        return nil
    }

    return json.Marshal(&struct {
        ImageURL           interface{} `json:"imageURL"`
        City               interface{} `json:"city"`
        PhoneNumber        interface{} `json:"phoneNumber"`
        MinPrice           interface{} `json:"minPrice"`
        VNIN               interface{} `json:"vnin"`
        FirstName          interface{} `json:"firstName"`
        MiddleName         interface{} `json:"middleName"`
        LastName           interface{} `json:"lastName"`
        DateOfBirth        interface{} `json:"dateOfBirth"`
        Gender             interface{} `json:"gender"`
        Description        interface{} `json:"description"`
        Email              interface{} `json:"email"`
        CACNumber          interface{} `json:"cacNumber"`
        IsBusinessVerified interface{} `json:"isBusinessVerified"`
        Alias
    }{
        ImageURL:           cleanStr(v.ImageURL),
        City:               cleanStr(v.City),
        PhoneNumber:        cleanStr(v.PhoneNumber),
        MinPrice:           cleanInt32(v.MinPrice),
        VNIN:               cleanStr(v.VNIN),
        FirstName:          cleanStr(v.FirstName),
        MiddleName:         cleanStr(v.MiddleName),
        LastName:           cleanStr(v.LastName),
        DateOfBirth:        cleanTime(v.DateOfBirth),
        Gender:             cleanStr(v.Gender),
        Description:        cleanStr(v.Description),
        Email:              cleanStr(v.Email),
        CACNumber:          cleanStr(v.CACNumber),
        IsBusinessVerified: cleanBool(v.IsBusinessVerified),
        Alias:              (Alias)(v),
    })
}


type Vendor struct {
    ID                   uuid.UUID      `json:"id" db:"id"`
    OwnerID              uuid.UUID      `json:"ownerId" db:"owner_id"`
    Name                 string         `json:"name" db:"name"`
    Category             string         `json:"category" db:"category"`
    ImageURL             sql.NullString `json:"imageURL" db:"image_url"`
    Status               VendorStatus   `json:"status" db:"status"`
    IsIdentityVerified   bool           `json:"isIdentityVerified" db:"is_identity_verified"`
    IsBusinessRegistered bool           `json:"isBusinessRegistered" db:"is_business_registered"`
    State                string         `json:"state" db:"state"`
    City                 sql.NullString `json:"city" db:"city"`
    PhoneNumber          sql.NullString `json:"phoneNumber" db:"phone_number"`
    MinPrice             sql.NullInt32  `json:"minPrice" db:"min_price"`
    PVSScore             int32          `json:"pvsScore" db:"pvs_score"`
    ReviewCount          int32          `json:"reviewCount" db:"review_count"`
    ProfileCompletion    float32        `json:"-" db:"profile_completion"`
    InquiryCount         int32          `json:"-" db:"inquiry_count"`
    RespondedCount       int32          `json:"-" db:"responded_count"`
    CreatedAt            time.Time      `json:"createdAt" db:"created_at"`
    UpdatedAt            time.Time      `json:"updatedAt" db:"updated_at"`
    VNIN                 sql.NullString `json:"vnin" db:"vnin"`
    FirstName            sql.NullString `json:"firstName" db:"first_name"`
    MiddleName           sql.NullString `json:"middleName" db:"middle_name"`
    LastName             sql.NullString `json:"lastName" db:"last_name"`
    DateOfBirth          sql.NullTime   `json:"dateOfBirth" db:"date_of_birth"`
    Gender               sql.NullString `json:"gender" db:"gender"`
    Description          sql.NullString `json:"description" db:"description"`
    Email                sql.NullString `json:"email" db:"email"`
    CACNumber            sql.NullString `json:"cacNumber" db:"cac_number"`
    IsBusinessVerified   sql.NullBool   `json:"isBusinessVerified" db:"is_business_verified"`
    // Ensure this matches the VARCHAR(20) in DB
    SubscriptionTier     SubscriptionTier `json:"subscriptionTier" db:"subscription_tier"`
}

func CalculatePVS(v *Vendor) int32 {
	var score int32 = 0

	if v.IsIdentityVerified {
		score += 30
		if v.IsBusinessVerified.Valid && v.IsBusinessVerified.Bool {
			score += 40
		}
	}

	score += int32(15.0 * (v.ProfileCompletion / 100.0))

	if v.ReviewCount >= 20 {
		score += 10
	} else if v.ReviewCount >= 10 {
		score += 7
	} else if v.ReviewCount >= 1 {
		score += 3
	}

	if v.InquiryCount > 0 {
		responseRate := float32(v.RespondedCount) / float32(v.InquiryCount)
		score += int32(5.0 * responseRate)
	}

	if score > 100 {
		score = 100
	}
	return score
}