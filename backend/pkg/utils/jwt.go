// eventify/backend/pkg/utils/jwt.go
package utils

import (
	"errors"
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
)

// Step 1: Enhanced claims structure with token type differentiation
type Claims struct {
	UserID    string `json:"user_id"`
	TokenType string `json:"token_type"` // "access" or "refresh"
	jwt.StandardClaims
}

// Step 2: Token type constants
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// Step 3: Separate secret management for each token type
func getAccessTokenSecret() []byte {
	secret := os.Getenv("JWT_ACCESS_SECRET")
	if secret == "" {
		// In production, this should panic or fail startup
		return []byte("access-token-very-strong-secret-change-in-prod")
	}
	return []byte(secret)
}

func getRefreshTokenSecret() []byte {
	secret := os.Getenv("JWT_REFRESH_SECRET") 
	if secret == "" {
		// Different secret for refresh tokens
		return []byte("refresh-token-very-strong-secret-change-in-prod")
	}
	return []byte(secret)
}

// Step 4: Get appropriate secret based on token type
func getSecretForTokenType(tokenType string) []byte {
	switch tokenType {
	case TokenTypeAccess:
		return getAccessTokenSecret()
	case TokenTypeRefresh:
		return getRefreshTokenSecret()
	default:
		return getAccessTokenSecret() // Fallback
	}
}

// Step 5: Generate Access Token with RS256 (asymmetric crypto)
func GenerateAccessJWT(userID string) (string, error) {
	claims := Claims{
		UserID:    userID,
		TokenType: TokenTypeAccess,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Minute * 15).Unix(), // 15 minutes
			IssuedAt:  time.Now().Unix(),
			Issuer:    "eventify-api",
		},
	}

	// Using RS256 for better security and key separation
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	
	// Load RSA private key for signing
	privateKey, err := loadRSAPrivateKey()
	if err != nil {
		return "", err
	}

	tokenString, err := token.SignedString(privateKey)
	return tokenString, err
}

// Step 6: Generate Refresh Token with stronger crypto (HS512)
func GenerateRefreshJWT(userID string) (string, error) {
	claims := Claims{
		UserID:    userID,
		TokenType: TokenTypeRefresh,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
			IssuedAt:  time.Now().Unix(),
			Issuer:    "eventify-api",
		},
	}

	// Using HS512 for refresh tokens (stronger symmetric crypto)
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	tokenString, err := token.SignedString(getRefreshTokenSecret())

	return tokenString, err
}

// Step 7: Enhanced token validation with type checking
func ValidateJWT(tokenString string) (*Claims, error) {
	// First, parse without verification to check token type
	unverifiedToken, _, err := new(jwt.Parser).ParseUnverified(tokenString, &Claims{})
	if err != nil {
		return nil, err
	}

	claims, ok := unverifiedToken.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid token claims structure")
	}

	// Now validate with appropriate method based on token type
	var token *jwt.Token
	
	switch claims.TokenType {
	case TokenTypeAccess:
		// Use RSA public key for access token verification
		publicKey, err := loadRSAPublicKey()
		if err != nil {
			return nil, err
		}
		token, err = jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return publicKey, nil
		})
		
	case TokenTypeRefresh:
		// Use symmetric secret for refresh token verification
		token, err = jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return getRefreshTokenSecret(), nil
		})
		
	default:
		return nil, errors.New("unknown token type")
	}

	if err != nil || !token.Valid {
		return nil, err
	}

	validatedClaims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid token claims after validation")
	}

	return validatedClaims, nil
}

// Step 8: RSA key management (you'll need to generate these keys)
func loadRSAPrivateKey() (interface{}, error) {
	// Load from environment variable or file
	privateKeyPEM := os.Getenv("RSA_PRIVATE_KEY")
	if privateKeyPEM == "" {
		return nil, errors.New("RSA private key not configured")
	}
	
	// Parse RSA private key
	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM([]byte(privateKeyPEM))
	if err != nil {
		return nil, err
	}
	
	return privateKey, nil
}

func loadRSAPublicKey() (interface{}, error) {
	// Load from environment variable or file  
	publicKeyPEM := os.Getenv("RSA_PUBLIC_KEY")
	if publicKeyPEM == "" {
		return nil, errors.New("RSA public key not configured")
	}
	
	// Parse RSA public key
	publicKey, err := jwt.ParseRSAPublicKeyFromPEM([]byte(publicKeyPEM))
	if err != nil {
		return nil, err
	}
	
	return publicKey, nil
}

// Step 9: Helper to validate specific token type
func ValidateTokenType(tokenString string, expectedType string) (*Claims, error) {
	claims, err := ValidateJWT(tokenString)
	if err != nil {
		return nil, err
	}
	
	if claims.TokenType != expectedType {
		return nil, errors.New("invalid token type")
	}
	
	return claims, nil
}