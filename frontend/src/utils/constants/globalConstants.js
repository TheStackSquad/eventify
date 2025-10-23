//frontend/src/utils/constants/globalConstants.js

// ========== REDUX ACTION TYPES ==========
export const REDUX_ACTION_TYPES = {
  CREATE_EVENT: "events/createEvent",
  GET_EVENT_BY_ID: "events/getEventById",
  FETCH_USER_EVENTS: "events/fetchUserEvents",
  FETCH_ALL_EVENTS: "events/fetchAllEvents",
  FETCH_EVENT_ANALYTICS: "events/fetchEventAnalytics",
  UPDATE_EVENT: "events/updateEvent",
  DELETE_EVENT: "events/deleteEvent",
  PUBLISH_EVENT: "events/publishEvent",
  // VENDOR ACTIONS (New)
  FETCH_VENDORS: "vendors/fetchVendors",
  GET_VENDOR_PROFILE: "vendors/getVendorProfile",
  REGISTER_VENDOR: "vendors/registerVendor",

  // ADMIN VENDOR ACTIONS (New)
  TOGGLE_IDENTITY_VERIFICATION: "admin/toggleIdentityVerification",
  TOGGLE_BUSINESS_VERIFICATION: "admin/toggleBusinessVerification",
  DELETE_VENDOR: "admin/deleteVendor",
};

// ========== API ENDPOINTS ==========
export const API_ENDPOINTS = {
  EVENTS: {
    BASE: "/events",
    CREATE: "/create-events",
    GET_BY_ID: "/events/:eventId",
    UPDATE: "/events/:id",
    DELETE: "/events/:id",
    MY_EVENTS: "/events/my-events",
    ANALYTICS: "/events/:id/analytics",
    LIKE: "/events/:eventId/like",
    PUBLISH: "/events/:id/publish",
  },
  VENDORS: {
    BASE: "/api/v1/vendors",
    LIST: "/api/v1/vendors",
    GET_PROFILE: "/api/v1/vendors/:id",
    REGISTER: "/api/v1/vendors/register",
    UPDATE: "/api/v1/vendors/:id",
  },
  ADMIN_VENDORS: {
    BASE: "/api/v1/admin/vendors",
    VERIFY_IDENTITY: "/api/v1/admin/vendors/:id/verify/identity",
    VERIFY_BUSINESS: "/api/v1/admin/vendors/:id/verify/business",
    DELETE: "/api/v1/admin/vendors/:id",
  },
  UPLOAD: {
    EVENT_IMAGE: "/api/event-image",
  },
};

// ========== STATUS CONSTANTS (Dependency must come first) ==========
export const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
};

// ========== STATE DEFAULTS (These depend on STATUS, so they come after) ==========

export const VENDOR_DEFAULTS = {
  INITIAL_STATE: {
    // Public listing state
    vendors: [], // List of vendors for the search page
    selectedVendor: null, // Single vendor for the profile page
    // 💡 FIX: STATUS is now defined above and accessible
    status: STATUS.IDLE,
    error: null,

    // Search/Filter state
    filters: {
      state: "",
      category: "",
      minPrice: 0,
      // ... other filter parameters
    },
  },
};

export const EVENT_DEFAULTS = {
  INITIAL_STATE: {
    userEvents: [],
    selectedEvent: null,
    currentEvent: null,
    analytics: {
      totalRevenue: 0,
      ticketsSold: 0,
      ticketsRemaining: 0,
      viewCount: 0,
    },
    status: STATUS.IDLE,
    analyticsStatus: STATUS.IDLE,
    error: null,
  },
};

// ========== ERROR MESSAGES ==========
export const ERROR_MESSAGES = {
  // Event Operations
  CREATE_EVENT_FAILED: "Failed to create event",
  UPDATE_EVENT_FAILED: "Failed to update event",
  DELETE_EVENT_FAILED: "Failed to delete event",
  FETCH_EVENTS_FAILED: "Failed to fetch events",
  FETCH_EVENT_FAILED: "Failed to fetch event",
  FETCH_ANALYTICS_FAILED: "Failed to fetch analytics",
  // Vendor Operations (New)
  FETCH_VENDORS_FAILED: "Failed to fetch vendors list",
  FETCH_PROFILE_FAILED: "Failed to load vendor profile.",
  REGISTER_VENDOR_FAILED: "Failed to complete vendor registration.",

  // General
  AUTH_REQUIRED: "Authentication required. Please log in to continue.",
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred.",
};

// ========== SUCCESS MESSAGES ==========
export const SUCCESS_MESSAGES = {
  EVENT_CREATED: "🎉 Event created successfully!",
  EVENT_UPDATED: "🎉 Event updated successfully!",
  EVENT_DELETED: "Event deleted successfully!",
  EVENT_PUBLISHED: "Event published successfully!",
  // Vendor Operations (New)
  VENDOR_REGISTERED: "Vendor registration submitted successfully!",

  // Admin Operations (New)
  IDENTITY_VERIFIED: "Vendor identity verification status updated.",
  BUSINESS_VERIFIED: "Vendor business verification status updated.",
  VENDOR_DELETED: "Vendor permanently removed from the platform.",
};

// ========== ROUTES ==========
export const ROUTES = {
  LOGIN: "/account/auth/login",
  MY_EVENTS: "/events/my-events",
  CREATE_EVENT: "/events/create-events",

  // Vendor Routes (New)
  VENDOR_LISTING: "/vendors",
  VENDOR_PROFILE: "/vendors/:slug", // We'll use a slug for the UI route

  // Admin Routes (New)
  ADMIN_VENDOR_MANAGEMENT: "/admin/vendors",
};

// Named export for the entire constants object
const globalConstants = {
  REDUX_ACTION_TYPES,
  API_ENDPOINTS,
  STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
  EVENT_DEFAULTS,
  VENDOR_DEFAULTS, // 💡 NEW: Ensure VENDOR_DEFAULTS is included here
};

export default globalConstants;
