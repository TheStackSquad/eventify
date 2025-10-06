// eventify/backend/pkg/utils/jwt.go
package utils

import (
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
)

// Define the claims structure
type Claims struct {
	UserID string `json:"user_id"`
	jwt.StandardClaims
}

func GenerateJWT(userID string) (string, error) {
	// 1. Get Secret Key from environment variable
	jwtSecret := os.Getenv("JWT_SECRET") 
	if jwtSecret == "" {
		jwtSecret = "your-default-secret" // IMPORTANT: Change this!
	}
    
	// 2. Set claims (payload)
	claims := Claims{
		UserID: userID,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Hour * 24).Unix(), // Token expires in 24 hours
			IssuedAt:  time.Now().Unix(),
		},
	}
    
	// 3. Create token and sign it
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	
	return tokenString, err
}