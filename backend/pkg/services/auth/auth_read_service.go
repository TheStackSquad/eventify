// backend/pkg/services/auth/auth_read_service.go

package auth

import (
	"context"

	"github.com/eventify/backend/pkg/models"
	servicejwt "github.com/eventify/backend/pkg/services/jwt"
	repoauth "github.com/eventify/backend/pkg/repository/auth"
	repovendor "github.com/eventify/backend/pkg/repository/vendor"
	repoevent "github.com/eventify/backend/pkg/repository/event"
	"github.com/google/uuid"
)

// authReadService provides read-only identity and verification logic
type authReadService struct {
	authRepo repoauth.AuthRepository
	jwtService *servicejwt.JWTService
	vendorRepo repovendor.VendorRepository // <-- Add this
    eventRepo  repoevent.EventRepository
}


func (s *authReadService) GetUserProfile(ctx context.Context, userID uuid.UUID) (*models.UserProfile, error) {
    user, err := s.authRepo.GetUserByID(ctx, userID)
    if err != nil { return nil, ErrUserNotFound }

    // 1. Check if they have a business profile
    isVendor, _ := s.vendorRepo.IsRegisteredVendor(ctx, userID)

    // 2. Check if they are an organizer (Handles the Constellar case)
    hasEvents, _ := s.eventRepo.HasEventsByOrganizer(ctx, userID)

    // 3. ToUserProfile handles the rest (including Admin overrides)
    return user.ToUserProfile(isVendor, hasEvents), nil
}

// VerifyResetToken checks if a password reset token is valid and unexpired
func (s *authReadService) VerifyResetToken(ctx context.Context, token string) (bool, error) {
	_, err := s.authRepo.GetUserByResetToken(ctx, token)
	if err != nil {
		return false, nil
	}
	return true, nil
}

// backend/pkg/services/auth/auth_read_service.go

func (s *authReadService) ParseAccessToken(ctx context.Context, token string) (*servicejwt.Claims, error) {
    // 1. Use the JWT service to validate the string and parse claims
    claims, err := s.jwtService.ValidateAccessToken(token)
    if err != nil {
        // Log the error for internal debugging if needed
        return nil, ErrSessionExpired
    }

    // 2. Return the typed claims (this now matches your AuthService interface)
    return claims, nil
}