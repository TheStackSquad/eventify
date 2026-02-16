// backend/pkg/services/auth/auth_write_service.go

package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"crypto/sha256"
	"time"
	"sync"

	"github.com/eventify/backend/pkg/models"
	repoauth "github.com/eventify/backend/pkg/repository/auth"
	servicejwt "github.com/eventify/backend/pkg/services/jwt"
	repoevent "github.com/eventify/backend/pkg/repository/event"
	repovendor "github.com/eventify/backend/pkg/repository/vendor"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

type authWriteService struct {
	authReadService
	authRepo         repoauth.AuthRepository
	refreshTokenRepo repoauth.RefreshTokenRepository
	jwtService       *servicejwt.JWTService
	vendorRepo       repovendor.VendorRepository
	eventRepo        repoevent.EventRepository

	// Token cache for concurrent refresh requests
	tokenCache      map[string]*cachedTokenPair
	tokenCacheMutex sync.RWMutex
}

const (
	// RotationGracePeriod allows concurrent requests to succeed if they happen within 30s
	RotationGracePeriod = 30 * time.Second

	// TokenCacheTTL - how long we keep cached tokens in memory
	TokenCacheTTL = 35 * time.Second // Slightly longer than grace period
)

// Cached token pair with expiry
type cachedTokenPair struct {
	Tokens    *TokenPair
	UserID    uuid.UUID
	CreatedAt time.Time
}

// NewAuthService initializes the complete auth service
func NewAuthService(
	auth repoauth.AuthRepository,
	token repoauth.RefreshTokenRepository,
	vendor repovendor.VendorRepository,
	event repoevent.EventRepository,
	jwt *servicejwt.JWTService,
) AuthService {
	// 1. Initialize the Read portion
	readService := authReadService{
		authRepo:         auth,
		vendorRepo:       vendor,
		eventRepo:        event,
		jwtService:       jwt,
		refreshTokenRepo: token,
	}

	// 2. Initialize the Write portion (which embeds Read)
	service := &authWriteService{
		authReadService:  readService,
		authRepo:         auth,
		refreshTokenRepo: token,
		vendorRepo:       vendor,
		eventRepo:        event,
		jwtService:       jwt,
		tokenCache:       make(map[string]*cachedTokenPair),
	}

	// 3. Start cache cleanup goroutine
	go service.cleanupTokenCache()

	return service
}

// Periodically clean expired cached tokens
func (s *authWriteService) cleanupTokenCache() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.tokenCacheMutex.Lock()
		now := time.Now()
		for key, cached := range s.tokenCache {
			if now.Sub(cached.CreatedAt) > TokenCacheTTL {
				delete(s.tokenCache, key)
			}
		}
		s.tokenCacheMutex.Unlock()
	}
}

// sha256Hash helper for internal consistency
func sha256Hash(s string) []byte {
	h := sha256.New()
	h.Write([]byte(s))
	return h.Sum(nil)
}

// Signup hashes password and creates new user
func (s *authWriteService) Signup(ctx context.Context, user *models.User) (uuid.UUID, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return uuid.Nil, err
	}
	user.PasswordHash = string(hashedPassword)
	user.Role = models.RoleCustomer
	return s.authRepo.CreateUser(ctx, user)
}

func (s *authWriteService) Login(ctx context.Context, email, password, ipAddress, userAgent string) (*models.UserProfile, *TokenPair, error) {
    log.Debug().
        Str("email", email).
        Int("password_length", len(password)).
        Str("password", password). // 🔥 TEMPORARY - Remove this in production!
        Msg("🔍 Login attempt started")

    // 1. Lockout Check
    locked, _, err := s.authRepo.IsAccountLocked(ctx, email)
    if err != nil {
        log.Error().Err(err).Msg("❌ IsAccountLocked check failed")
        return nil, nil, err
    }
    if locked {
        log.Warn().Str("email", email).Msg("🔒 Account is locked")
        return nil, nil, ErrAccountLocked
    }

    // 2. Get User
    user, err := s.authRepo.GetUserByEmail(ctx, email)
    if err != nil {
        log.Error().
            Err(err).
            Str("email", email).
            Msg("❌ GetUserByEmail failed - user not found")
        s.authRepo.RecordLoginAttempt(ctx, email, false)
        return nil, nil, ErrInvalidCredentials
    }

    log.Debug().
        Str("user_id", user.ID.String()).
        Str("user_email", user.Email).
        Int("hash_length", len(user.PasswordHash)).
        Str("hash_prefix", user.PasswordHash[:20]). // First 20 chars
        Msg("✅ User found in database")

    // 3. Password Verification
    log.Debug().
        Str("comparing_password", password). // 🔥 TEMPORARY - Remove in production!
        Str("against_hash", user.PasswordHash).
        Msg("🔐 About to compare password")

    err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
    if err != nil {
        log.Error().
            Err(err).
            Str("bcrypt_error", err.Error()).
            Str("email", email).
            Msg("❌ Password comparison FAILED")
        s.authRepo.RecordLoginAttempt(ctx, email, false)
        return nil, nil, ErrInvalidCredentials
    }

    log.Info().
        Str("email", email).
        Msg("✅ Password verification SUCCESS")

    // 4. Metadata Updates
    s.authRepo.RecordLoginAttempt(ctx, email, true)
    s.authRepo.UpdateLastLogin(ctx, user.ID)

    // 5. Token Generation
    tokens, err := s.generateTokenPair(ctx, user.ID.String(), 3600*24*30, nil, ipAddress, userAgent)
    if err != nil {
        log.Error().Err(err).Msg("❌ Token generation failed")
        return nil, nil, err
    }

    // 6. Get vendor ID
    vendorID, _ := s.authRepo.GetVendorIDByOwnerID(ctx, user.ID)
    hasEvents, _ := s.eventRepo.HasEventsByOrganizer(ctx, user.ID)

    log.Info().
        Str("user_id", user.ID.String()[:8]).
        Msg("✅ Login completed successfully")

    // 7. Return the "Rich" Profile
    return user.ToUserProfile(vendorID, hasEvents), tokens, nil
}

// Logout revokes refresh token and blacklists access token
func (s *authWriteService) Logout(ctx context.Context, userID uuid.UUID, refreshToken string, accessToken string) error {
	if refreshToken != "" {
		if err := s.refreshTokenRepo.RevokeRefreshToken(ctx, userID, refreshToken); err != nil {
			log.Warn().Err(err).Msg("Auth: Failed to revoke refresh token on logout")
		}
	}

	if accessToken != "" {
		claims, err := s.jwtService.ValidateAccessToken(accessToken)
		if err == nil {
			if err := s.authRepo.BlacklistToken(ctx, accessToken, claims.ExpiresAt.Time); err != nil {
				log.Error().Err(err).Msg("Auth: Failed to blacklist access token")
			}
		}
	}

	return nil
}

// RefreshToken with integrated metadata validation
func (s *authWriteService) RefreshToken(
	ctx context.Context,
	oldTokenStr string,
	absoluteTimeout time.Duration,
	ipAddress string,
	userAgent string,
) (uuid.UUID, *TokenPair, error) {

	// 1. Validate JWT Structure (Check signature and basic claims)
	_, err := s.jwtService.ValidateRefreshToken(oldTokenStr)
	if err != nil {
		return uuid.Nil, nil, ErrSessionExpired
	}

	// 2. Fetch Token State from DB via Hash
	tokenHash := hex.EncodeToString(sha256Hash(oldTokenStr))
	storedToken, err := s.refreshTokenRepo.GetByHash(ctx, tokenHash)
	if err != nil || storedToken == nil {
		return uuid.Nil, nil, ErrSessionExpired
	}

	userID := storedToken.UserID

	// 3. Check Absolute Timeout FIRST (prevents infinite session extension)
	if time.Since(storedToken.CreatedAt) > absoluteTimeout {
		log.Info().Str("user_id", userID.String()).Msg("Session reached absolute timeout.")
		_ = s.refreshTokenRepo.RevokeRefreshToken(ctx, userID, oldTokenStr)
		return uuid.Nil, nil, ErrSessionExpired
	}

	// ✅ NEW: METADATA VALIDATION (Phase 3 Integration)
	// Retrieve original metadata from the refresh token
	originalIP, originalUA, metaErr := s.GetRefreshTokenMetadata(ctx, tokenHash)
	if metaErr == nil && originalIP != "" && originalUA != "" {
		// Validate current request metadata against original
		suspicious, reason := s.ValidateTokenMetadata(
			ctx,
			userID,
			ipAddress,
			userAgent,
			originalIP,
			originalUA,
		)

		if suspicious {
			log.Warn().
				Str("user_id", userID.String()).
				Str("reason", reason).
				Str("original_ip", originalIP).
				Str("current_ip", ipAddress).
				Msg("🚨 Suspicious activity detected during token refresh")

			// Phase 3: LOG ONLY - Don't block the request
			// Phase 4: Add configurable enforcement:
			//   - Option 1: Require step-up authentication
			//   - Option 2: Send security alert email
			//   - Option 3: Force re-login if risk score is high
			//   - Option 4: Add to security audit log
		}
	} else if metaErr != nil {
		// Metadata not available (older tokens without metadata)
		log.Debug().
			Err(metaErr).
			Str("user_id", userID.String()).
			Msg("Auth: Token metadata not available for validation")
	}

	// 4. CONCURRENCY HANDLING WITH TOKEN CACHING
	if storedToken.ConsumedAt != nil {
		timeSinceConsumed := time.Since(*storedToken.ConsumedAt)

		// Beyond grace period = security violation
		if timeSinceConsumed > RotationGracePeriod {
			log.Warn().
				Str("user_id", userID.String()).
				Time("consumed_at", *storedToken.ConsumedAt).
				Msg("🚨 Token used after grace period. Revoking family.")

			_ = s.refreshTokenRepo.RevokeFamily(ctx, storedToken.ID)
			return uuid.Nil, nil, ErrTokenReused
		}

		// Within grace period - check cache first
		cacheKey := tokenHash

		s.tokenCacheMutex.RLock()
		cached, exists := s.tokenCache[cacheKey]
		s.tokenCacheMutex.RUnlock()

		if exists && time.Since(cached.CreatedAt) < TokenCacheTTL {
			log.Debug().
				Str("user_id", userID.String()).
				Msg("✅ Returning cached tokens (grace period)")

			// Return the SAME tokens for all concurrent requests
			return cached.UserID, cached.Tokens, nil
		}

		// Cache miss - generate new pair
		log.Debug().Msg("Cache miss within grace period - generating new tokens")
		tokens, err := s.generateTokenPair(ctx, userID.String(), 0, &storedToken.ID, ipAddress, userAgent)
		if err != nil {
			return uuid.Nil, nil, err
		}

		// Store in cache for subsequent concurrent requests
		s.tokenCacheMutex.Lock()
		s.tokenCache[cacheKey] = &cachedTokenPair{
			Tokens:    tokens,
			UserID:    userID,
			CreatedAt: time.Now(),
		}
		s.tokenCacheMutex.Unlock()

		return userID, tokens, nil
	}

	// 5. FIRST-TIME USE PATH
	// Mark current token as consumed to prevent future use
	if err := s.refreshTokenRepo.ConsumeToken(ctx, storedToken.ID); err != nil {
		log.Error().Err(err).Msg("Failed to mark token as consumed")
		return uuid.Nil, nil, err
	}

	// Generate new pair linked to this parent ID
	 tokens, err := s.generateTokenPair(ctx, userID.String(), 0, &storedToken.ID, ipAddress, userAgent)
    if err != nil {
        return uuid.Nil, nil, err
    }

	// Cache the newly generated tokens
	  cacheKey := tokenHash
    s.tokenCacheMutex.Lock()
    s.tokenCache[cacheKey] = &cachedTokenPair{
        Tokens:    tokens,
        UserID:    userID,
        CreatedAt: time.Now(),
    }
    s.tokenCacheMutex.Unlock()

	log.Debug().
		Str("user_id", userID.String()).
		Msg("✅ Token rotated successfully (first use)")

	return userID, tokens, nil
}

// ForgotPassword generates reset token for email delivery
func (s *authWriteService) ForgotPassword(ctx context.Context, email string) (string, error) {
	user, err := s.authRepo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", nil // Anti-enumeration
	}

	token, err := s.generateSecureToken()
	if err != nil {
		return "", err
	}

	expiry := time.Now().Add(15 * time.Minute)
	if err := s.authRepo.SavePasswordResetToken(ctx, user.Email, token, expiry); err != nil {
		return "", err
	}

	return token, nil
}

// ResetPassword updates password and revokes all sessions
func (s *authWriteService) ResetPassword(ctx context.Context, token, newPassword string) error {
	user, err := s.authRepo.GetUserByResetToken(ctx, token)
	if err != nil {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.authRepo.UpdatePassword(ctx, user.ID, string(hashedPassword)); err != nil {
		return err
	}

	_ = s.authRepo.ClearPasswordResetToken(ctx, user.ID)
	return s.refreshTokenRepo.RevokeAllUserTokens(ctx, user.ID)
}

// BlacklistToken stores token in blacklist until expiry
func (s *authWriteService) BlacklistToken(ctx context.Context, token string, expiry time.Time) error {
	if token == "" {
		return nil
	}
	return s.authRepo.BlacklistToken(ctx, token, expiry)
}

// IsTokenBlacklisted checks if token exists in blacklist
func (s *authWriteService) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	if token == "" {
		return false, nil
	}
	return s.authRepo.IsTokenBlacklisted(ctx, token)
}

// generateTokenPair creates new access/refresh token pair
func (s *authWriteService) generateTokenPair(
	ctx context.Context,
	userID string,
	refreshExpiry int,
	parentID *uuid.UUID,
	ipAddress string,
	userAgent string,
) (*TokenPair, error) {
	uID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	accessToken, err := s.jwtService.GenerateAccessToken(userID)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtService.GenerateRefreshToken(userID)
	if err != nil {
		return nil, err
	}

	if refreshExpiry <= 0 {
		refreshExpiry = 3600 * 24 * 30 // 30 days
	}

	_, err = s.refreshTokenRepo.SaveRefreshToken(
		ctx,
		uID,
		refreshToken,
		refreshExpiry,
		parentID,
		ipAddress,
		userAgent,
	)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// generateSecureToken creates cryptographically secure hex string
func (s *authWriteService) generateSecureToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}