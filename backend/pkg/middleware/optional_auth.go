//backend/pkg/middleware/optional_auth.go

package middleware

import (
	"eventify/backend/pkg/utils"
//	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OptionalAuth checks for JWT but allows anonymous access if not found or invalid.
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {

		if c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		accessToken, err := c.Cookie("access_token")
		if err != nil || accessToken == "" {
			// No token provided — continue anonymously
			log.Debug().Msg("No access token provided — continuing as guest")
			c.Next()
			return
		}

		// Validate token if provided
		claims, err := utils.ValidateJWT(accessToken)
		if err != nil {
			// Invalid or expired — continue anonymously
			log.Debug().Err(err).Msg("Invalid or expired token — continuing as guest")
			c.Next()
			return
		}

		// Convert user_id to ObjectID for consistency
		userObjectID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			log.Warn().Err(err).Msg("Malformed user_id in token — continuing as guest")
			c.Next()
			return
		}

		// Store user info in Gin context
		c.Set("user_id", userObjectID)
		c.Set("user_id_string", claims.UserID)

		log.Debug().Str("user_id", claims.UserID).Msg("User authenticated via optional auth")

		c.Next()
	}
}
