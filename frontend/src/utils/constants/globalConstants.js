// frontend/src/utils/constants/globalConstants.js

/**
 * Global Constants for Event Management Application
 * Centralized location for all constants used across Redux, components, and forms
 */

// ========== REDUX ACTION TYPES ==========
export const REDUX_ACTION_TYPES = {
  // Event Actions
  CREATE_EVENT: "events/createEvent",
  UPDATE_EVENT: "events/updateEvent",
  DELETE_EVENT: "events/deleteEvent",
  GET_EVENT_BY_ID: "events/getEventById",
  GET_USER_EVENTS: "events/getUserEvents",
  FETCH_EVENT_ANALYTICS: "events/fetchEventAnalytics",
  PUBLISH_EVENT: "events/publishEvent",

  // Event Action Aliases (for compatibility)
  FETCH_USER_EVENTS: "events/fetchUserEvents",
};

// ========== API ENDPOINTS ==========
export const API_ENDPOINTS = {
  EVENTS: {
    BASE: "/events",
    CREATE: "/events",
    GET_BY_ID: "/events/:eventId",
    UPDATE: "/events/:id",
    DELETE: "/events/:id",
    MY_EVENTS: "/events/my-events",
    ANALYTICS: "/events/:id/analytics",
    PUBLISH: "/events/:id/publish",
  },
  UPLOAD: {
    EVENT_IMAGE: "/api/event-image",
  },
};

// ========== STATUS CONSTANTS ==========
export const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
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
};

// ========== ROUTES ==========
export const ROUTES = {
  LOGIN: "/auth/login",
  MY_EVENTS: "/events/my-events",
  CREATE_EVENT: "/events/create-events",
};

// ========== EVENT STATE DEFAULTS ==========
export const EVENT_DEFAULTS = {
  INITIAL_STATE: {
    userEvents: [],
    selectedEvent: null,
    currentEvent: null, // NEW: for form editing
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

// Named export for the entire constants object
const globalConstants = {
  REDUX_ACTION_TYPES,
  API_ENDPOINTS,
  STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
  EVENT_DEFAULTS,
};

export default globalConstants;
