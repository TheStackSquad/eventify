//backend/pkg/middleware/admin_auth.go

package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	// Import the AuthRepository interface (which contains IsUserAdmin)
	"eventify/backend/pkg/repository" 
)

// AdminAuthMiddleware injects the repository dependency required to check the user's role.
// This decouples the middleware from direct MongoDB access.
func AdminMiddleware(authRepo repository.AuthRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Get User ID from Context (set by AuthMiddleware)
		userIDValue, exists := c.Get("user_id_string")
		if !exists {
			log.Error().Msg("AdminMiddleware called without AuthMiddleware running first.")
			c.JSON(http.StatusForbidden, gin.H{"message": "Access denied: Authentication failure."})
			c.Abort()
			return
		}

		userID, ok := userIDValue.(string)
		if !ok || userID == "" {
			log.Error().Msg("User ID in context is invalid or missing.")
			c.JSON(http.StatusForbidden, gin.H{"message": "Access denied: Invalid user identifier."})
			c.Abort()
			return
		}

		// 2. Authorization Check via the injected repository
		// Use the request context for cancellation/timeout
		isAdmin, err := authRepo.IsUserAdmin(c.Request.Context(), userID)

		if err != nil {
			log.Error().Err(err).Str("user_id", userID).Msg("Database error during admin check")
			// If error is "not found", return 403. Otherwise, 500.
			if err.Error() == "user not found" {
				c.JSON(http.StatusForbidden, gin.H{"message": "Access denied: User not found."})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal error checking user role."})
			}
			c.Abort()
			return
		}

		// 3. Authorization Check (IsAdmin flag)
		if !isAdmin {
			log.Warn().Str("user_id", userID).Msg("User attempted to access admin route without authorization")
			c.JSON(http.StatusForbidden, gin.H{"message": "Authorization failed: Insufficient permissions."})
			c.Abort()
			return
		}

		// 4. Success: Continue to the handler
		log.Debug().Str("user_id", userID).Msg("Admin user granted access.")
		c.Next()
	}
}
