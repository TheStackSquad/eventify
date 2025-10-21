// backend/pkg/middleware/authentication.go

package middleware

import (
	"net/http"

	"eventify/backend/pkg/utils"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Step 1: AuthMiddleware validates the access token from cookies
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		if c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}
		
		// Step 2: Extract access token from cookie
		accessToken, err := c.Cookie("access_token")
		
		if err != nil {
			log.Warn().Msg("No access token found in request")
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Authentication required.",
			})
			c.Abort()
			return
		}

		// Step 3: Validate the JWT token
		claims, err := utils.ValidateJWT(accessToken)
		
		if err != nil {
			log.Warn().Err(err).Msg("Invalid or expired access token")
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid or expired token.",
			})
			c.Abort()
			return
		}

		// Step 4: Convert string user ID to ObjectID for MongoDB
		userObjectID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			log.Error().Err(err).Str("user_id", claims.UserID).Msg("Invalid user ID format")
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Invalid user identifier.",
			})
			c.Abort()
			return
		}

		// Step 5: Store user ID in context for use in handlers
		c.Set("user_id", userObjectID)
		c.Set("user_id_string", claims.UserID) // Also store as string for convenience

		// Step 6: Log successful authentication (optional)
		log.Debug().Str("user_id", claims.UserID).Msg("User authenticated successfully")

		// Step 7: Continue to the next handler
		c.Next()
	}
}