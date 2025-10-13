//backend/pkg/services/vendor_services.go

package services

import (
	"eventify/backend/pkg/models"
)

// Revised Weights (Total 100 points) for PVS calculation, excluding portfolio.
const (
	WeightIdentity        = 20
	WeightRegistration    = 20
	WeightProfileComplete = 10
	WeightResponseRate    = 20
	WeightBookingSuccess  = 30
    MaxBookingsForPoints  = 6 // Max 6 bookings (6 * 5 points/booking = 30)
    PointsPerBooking      = 5
)

// CalculatePVS runs the Platform Verified Score (PVS) logic on a vendor struct
// and returns the new objective score (0-100).
func CalculatePVS(v *models.Vendor) int {
	score := 0

	// 1. Identity and Business Verification (Max 40 points)
	if v.IsIdentityVerified {
		score += WeightIdentity
	}
	if v.IsBusinessRegistered {
		score += WeightRegistration
	}

	// 2. Profile Completeness (Max 10 points)
    // ProfileCompletion is assumed to be a float32 between 0.0 and 1.0.
    // We cast the weighted score to an integer for the final score.
	score += int(float32(WeightProfileComplete) * v.ProfileCompletion)

	// 3. Response Rate (Max 20 points)
	if v.InquiryCount > 0 {
		// Calculate the actual response rate (0.0 to 1.0)
		responseRate := float32(v.RespondedCount) / float32(v.InquiryCount)
		// Apply the rate to the maximum possible points for this component
		score += int(float32(WeightResponseRate) * responseRate)
	}

	// 4. Booking Success History (Max 30 points)
    // Points are capped at the WeightBookingSuccess.
    successPoints := v.BookingsCompleted * PointsPerBooking

    if successPoints > WeightBookingSuccess {
        successPoints = WeightBookingSuccess
    }

    // Alternatively, if using the MaxBookingsForPoints constant:
    // cappedBookings := v.BookingsCompleted
    // if cappedBookings > MaxBookingsForPoints {
    //     cappedBookings = MaxBookingsForPoints
    // }
    // successPoints := cappedBookings * PointsPerBooking

    score += successPoints

	// Ensure the score is within the 0-100 range, although our calculation should prevent overflow.
    if score > 100 {
        return 100
    }

	return score
}
