// backend/pkg/routes/router.go
package routes

import (
	"net/http"
	"time"

	handleranalytics "github.com/eventify/backend/pkg/handlers/analytics"
	handlerauth "github.com/eventify/backend/pkg/handlers/auth"
	handlerevent "github.com/eventify/backend/pkg/handlers/event"
	handlerfeedback "github.com/eventify/backend/pkg/handlers/feedback"
	handlerinquiries "github.com/eventify/backend/pkg/handlers/inquiries"
	handlerorder "github.com/eventify/backend/pkg/handlers/order"
	handlerreview "github.com/eventify/backend/pkg/handlers/review"
	handlersubscription "github.com/eventify/backend/pkg/handlers/subscription"
	handlervendor "github.com/eventify/backend/pkg/handlers/vendor"

	"github.com/eventify/backend/pkg/services/auth"
	repoauth "github.com/eventify/backend/pkg/repository/auth"
	servicejwt "github.com/eventify/backend/pkg/services/jwt"

	"github.com/eventify/backend/pkg/middleware"
	"github.com/eventify/backend/pkg/utils"

	"github.com/gin-contrib/cors"
	ginzerolog "github.com/gin-contrib/logger"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

const serviceName = "router"

func ConfigureRouter(
	authHandler *handlerauth.AuthHandler,
	eventHandler *handlerevent.EventHandler,
	vendorHandler *handlervendor.VendorHandler,
	reviewHandler *handlerreview.ReviewHandler,
	inquiryHandler *handlerinquiries.InquiryHandler,
	feedbackHandler *handlerfeedback.FeedbackHandler,
	orderHandler *handlerorder.OrderHandler,
	subscriptionHandler *handlersubscription.SubscriptionHandler,
	authRepo repoauth.AuthRepository,
	analyticsHandler *handleranalytics.AnalyticsHandler,
	vendorAnalyticsHandler *handlervendor.VendorAnalyticsHandler,
	vendorLeaderboardHandler *handlervendor.VendorLeaderboardHandler,
	jwtService *servicejwt.JWTService,
	authService auth.AuthService,
) *gin.Engine {
	utils.LogInfo(serviceName, "configure", "Initializing router configuration")

	// Configure CSRF
	csrfConfig := middleware.CSRFConfig{
		TokenLength: middleware.CSRFTokenLength,
		CookieName:  middleware.CSRFTokenCookieName,
		HeaderName:  middleware.CSRFTokenHeaderName,
		// Skip CSRF for public endpoints
		Skip: middleware.SkipCSRFForPaths(
			"/auth/login",
			"/auth/signup",
			"/auth/refresh",
			"/auth/forgot-password",
			"/auth/reset-password",
			"/auth/verify-reset-token",
			"/api/webhooks/paystack", // Webhooks don't need CSRF
		),
	}

	router := gin.New()
	router.RedirectTrailingSlash = false

	// Global middleware (applied to all routes)
	router.Use(gin.Recovery())
	router.Use(requestLogger())
	router.Use(ginzerolog.SetLogger())
	router.Use(corsConfig())
	router.Use(middleware.GuestMiddleware())
//	router.Use(middleware.CORSMiddleware())

	log.Info().
		Bool("skip_localhost", utils.SkipLocalhostRateLimit).
		Msg("🔒 Rate limiting configured")

	// ============================================
	// PUBLIC ROUTES (No auth, no CSRF required)
	// ============================================
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Eventify API is running",
			"status":  "healthy",
		})
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"rate_limiting": gin.H{
				"skip_localhost": utils.SkipLocalhostRateLimit,
			},
		})
	})

	// ============================================
	// AUTH ROUTES (Special handling)
	// ============================================
	auth := router.Group("/auth")
	auth.Use(middleware.RateLimit(utils.AuthLimiter))
	{
		// Public auth endpoints (no CSRF)
		auth.POST("/signup", authHandler.Signup)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.GET("/verify-reset-token", authHandler.VerifyResetToken)
		auth.POST("/reset-password", authHandler.ResetPassword)

		// Protected auth endpoints (require CSRF)
		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		protected.Use(middleware.CSRFProtection(csrfConfig))
		{
			protected.POST("/logout", authHandler.Logout)
			protected.GET("/me", authHandler.GetCurrentUser) // GET but still needs CSRF cookie
		}
	}

	// ============================================
	// PUBLIC VENDOR ROUTES
	// ============================================
	vendorPublic := router.Group("/api/v1/vendors")
	vendorPublic.Use(middleware.RateLimit(utils.PublicLimiter))
	{
		vendorPublic.GET("", vendorHandler.ListVendors)
		vendorPublic.GET("/:id", vendorHandler.TrackProfileView, vendorHandler.GetVendorProfile)
	}

	// Public vendor analytics health check
	vendorAnalyticsHealth := router.Group("/api/v1/vendors/analytics")
	{
		vendorAnalyticsHealth.GET("/health", vendorAnalyticsHandler.GetAnalyticsHealth)
	}

	// Public leaderboard routes
	leaderboard := router.Group("/api/v1/leaderboard")
	leaderboard.Use(middleware.RateLimit(utils.PublicLimiter))
	{
		leaderboard.GET("/top-by-categories", vendorLeaderboardHandler.GetTopByCategories)
		leaderboard.GET("/top-by-locations", vendorLeaderboardHandler.GetTopByLocations)
		leaderboard.GET("/vendor-of-month", vendorLeaderboardHandler.GetVendorOfTheMonth)
		leaderboard.GET("/category/:category", vendorLeaderboardHandler.GetTopVendorsByCategory)
		leaderboard.GET("/location/:state", vendorLeaderboardHandler.GetTopVendorsByLocation)
	}

	// Public events
	publicEvents := router.Group("/events")
	publicEvents.Use(middleware.RateLimit(utils.PublicLimiter))
	{
		publicEvents.GET("", eventHandler.GetAllEvents)
		publicEvents.GET("/:eventId", eventHandler.GetPublicEventByID)
		publicEvents.POST("/:eventId/like",
			middleware.RateLimit(utils.WriteLimiter),
			middleware.OptionalAuth(jwtService),
			eventHandler.ToggleLike,
		)
	}

	// ============================================
	// PUBLIC FEEDBACK (Guest submissions)
	// ============================================
	router.POST("/api/v1/feedback",
		middleware.RateLimit(utils.WriteLimiter),
		feedbackHandler.CreateFeedback,
	)

	// ============================================
	// PROTECTED ROUTES (Require Auth + CSRF)
	// ============================================
	
	// Vendor protected routes
	vendorProtected := router.Group("/api/v1/vendors")
	vendorProtected.Use(
		middleware.AuthMiddleware(authService),
		middleware.RateLimit(utils.WriteLimiter),
		middleware.CSRFProtection(csrfConfig),
	)
	{
		vendorProtected.POST("/register", vendorHandler.RegisterVendor)
		vendorProtected.PATCH("/:id", vendorHandler.UpdateVendor)
	}

	// Vendor analytics (protected)
	vendorAnalytics := router.Group("/api/v1/vendors/:id/analytics")
	vendorAnalytics.Use(
		middleware.AuthMiddleware(authService),
		middleware.CSRFProtection(csrfConfig),
	)
	{
		vendorAnalytics.GET("/overview", vendorAnalyticsHandler.GetVendorAnalytics)
	}

	// Event management (protected)
	protectedEvents := router.Group("/api/events")
	protectedEvents.Use(
		middleware.AuthMiddleware(authService),
		middleware.RateLimit(utils.WriteLimiter),
		middleware.CSRFProtection(csrfConfig),
	)
	{
		protectedEvents.POST("/create", eventHandler.CreateEvent)
		protectedEvents.GET("/my-events", eventHandler.GetUserEvents)
		protectedEvents.GET("/:eventId", eventHandler.GetEventByID)
		protectedEvents.PUT("/:eventId", eventHandler.UpdateEvent)
		protectedEvents.DELETE("/:eventId", eventHandler.DeleteEvent)
		protectedEvents.GET("/:eventId/analytics", analyticsHandler.FetchEventAnalytics)
	}

	// Ticket gate (protected)
	gateRoutes := router.Group("/api/v1/gate")
	gateRoutes.Use(
		middleware.AuthMiddleware(authService),
		middleware.RateLimit(utils.WriteLimiter),
		middleware.CSRFProtection(csrfConfig),
	)
	{
		gateRoutes.POST("/check-in", eventHandler.CheckIn)
	}

	// Subscription (protected)
	protectedSubscription := router.Group("/api/v1/subscription")
	protectedSubscription.Use(
		middleware.AuthMiddleware(authService),
		middleware.RateLimit(utils.WriteLimiter),
		middleware.CSRFProtection(csrfConfig),
	)
	{
		protectedSubscription.POST("/initiate", subscriptionHandler.InitiateSubscription)
		protectedSubscription.GET("/me", subscriptionHandler.GetMySubscription)
		protectedSubscription.GET("/verify/:reference", subscriptionHandler.VerifySubscription)
	}

	// ============================================
	// ORDER & PAYMENT ROUTES (Mixed auth)
	// ============================================
	paymentRoutes := router.Group("/api/payments")
	paymentRoutes.Use(middleware.RateLimit(utils.PublicLimiter))
	{
		paymentRoutes.GET("/verify/:reference", orderHandler.VerifyPayment)
	}

	orderRoutes := router.Group("/api/orders")
	orderRoutes.Use(middleware.RateLimit(utils.WriteLimiter))
	{
		orderRoutes.Use(middleware.OptionalAuth(jwtService))
		orderRoutes.POST("/initialize", orderHandler.InitializeOrder)
	}

	// Webhook (no auth, no CSRF)
	router.POST("/api/webhooks/paystack", orderHandler.HandlePaystackWebhook)

	// ============================================
	// REVIEWS & INQUIRIES (Mixed - some public, some protected)
	// ============================================
	RegisterReviewRoutes(router, reviewHandler, jwtService, csrfConfig)
	RegisterInquiryRoutes(router, inquiryHandler, jwtService, csrfConfig)

	// ============================================
	// ADMIN ROUTES (Admin auth + CSRF)
	// ============================================
	setupAdminRoutes(router, authHandler, eventHandler, vendorHandler, reviewHandler,
		inquiryHandler, feedbackHandler, vendorAnalyticsHandler, authRepo, authService, csrfConfig)

	utils.LogSuccess(serviceName, "configure", "Router configuration completed")
	printRegisteredRoutes(router)

	return router
}

func setupAdminRoutes(
	r *gin.Engine,
	ah *handlerauth.AuthHandler,
	eh *handlerevent.EventHandler,
	vh *handlervendor.VendorHandler,
	rh *handlerreview.ReviewHandler,
	ih *handlerinquiries.InquiryHandler,
	fh *handlerfeedback.FeedbackHandler,
	vah *handlervendor.VendorAnalyticsHandler,
	repo repoauth.AuthRepository,
	authService auth.AuthService,
	csrfConfig middleware.CSRFConfig,
) {
	admin := r.Group("/api/v1/admin")
	admin.Use(
		middleware.AuthMiddleware(authService),
		middleware.AdminMiddleware(repo),
		middleware.CSRFProtection(csrfConfig),
	)
	{
		admin.PUT("/vendors/:id/verify/identity", vh.ToggleIdentityVerification)
		admin.GET("/feedback", fh.GetAllFeedback)
		admin.DELETE("/feedback/:id", fh.DeleteFeedback)
		admin.POST("/analytics/refresh", vah.ManualAnalyticsRefresh)
	}
}

func RegisterReviewRoutes(r *gin.Engine, reviewHandler *handlerreview.ReviewHandler,
	jwtService *servicejwt.JWTService, csrfConfig middleware.CSRFConfig) {
	
	reviews := r.Group("/api/v1/vendors/:id/reviews")
	{
		// Public GET
		reviews.GET("", reviewHandler.GetVendorReviews)
		
		// Protected POST (requires CSRF)
		protected := reviews.Group("")
		protected.Use(
			middleware.RateLimit(utils.WriteLimiter),
			middleware.OptionalAuth(jwtService),
			middleware.CSRFProtection(csrfConfig),
		)
		{
			protected.POST("", reviewHandler.CreateReview)
		}
	}
}

func RegisterInquiryRoutes(r *gin.Engine, inquiryHandler *handlerinquiries.InquiryHandler,
	jwtService *servicejwt.JWTService, csrfConfig middleware.CSRFConfig) {
	
	inquiries := r.Group("/api/v1/inquiries")
	{
		// Public GET
		inquiries.GET("/vendor/:vendor_id", inquiryHandler.GetVendorInquiries)
		
		// Protected POST (guest or auth, requires CSRF)
		inquiries.POST("/vendor/:vendor_id",
			middleware.RateLimit(utils.WriteLimiter),
			middleware.GuestMiddleware(),
			middleware.OptionalAuth(jwtService),
			middleware.CSRFProtection(csrfConfig),
			inquiryHandler.CreateInquiry,
		)
	}
}

func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		log.Info().
			Str("method", c.Request.Method).
			Str("path", path).
			Str("query", query).
			Int("status", c.Writer.Status()).
			Str("latency", time.Since(start).String()).
			Msg("📥 HTTP Request")
	}
}

func corsConfig() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "HEAD", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-CSRF-Token"},
		ExposeHeaders:    []string{"Content-Length", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}

func printRegisteredRoutes(router *gin.Engine) {
	utils.LogDebug(serviceName, "routes", "Registered routes:")
	for _, route := range router.Routes() {
		log.Debug().Str("method", route.Method).Str("path", route.Path).Msg("  Route")
	}
}