// frontend/src/axiosConfig/axios.js
import axios from "axios";
// 1. Import the necessary constants
import { API_ENDPOINTS, ROUTES } from "../utils/constants/globalConstants";

// Step 1: Define the base URL using environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

console.log("Axios Base URL set to:", API_BASE_URL);

// 2. INTEGRATION: Update constants to use the imported endpoints
// The AUTH_ENDPOINTS are not in globalConstants.js, so we keep the local definition
// or, ideally, move them to globalConstants.js
const AUTH_ENDPOINTS = {
  REFRESH: "/auth/refresh",
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",
};

const REDIRECT_PATHS = {
  LOGIN: ROUTES.LOGIN,
  DASHBOARD: "/dashboard", // Keeping as is, since it's not in ROUTES
};

// 3. EXPORT ALL ENDPOINTS: Exporting all endpoints from this file for easy use
export const ENDPOINTS = {
  ...API_ENDPOINTS, // Includes EVENTS, VENDORS, ADMIN_VENDORS, UPLOAD
  AUTH: AUTH_ENDPOINTS,
};

// Step 2: Create axios instance
const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // CRITICAL: Sends cookies with every request
});

// Step 3: Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue = [];

// Step 4: Process queued requests after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Step 5: Helper function for login redirect
const redirectToLogin = () => {
  if (typeof window !== "undefined") {
    // 4. Use the integrated redirect path
    window.location.href = REDIRECT_PATHS.LOGIN;
  }
};

// Step 6: Request Interceptor (optional, for logging or adding headers)
instance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Step 7: Enhanced Response Interceptor (using integrated AUTH_ENDPOINTS)
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent handling non-401 errors or already retried requests
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Prevent refresh loop on refresh endpoint itself
    if (originalRequest.url === AUTH_ENDPOINTS.REFRESH) {
      isRefreshing = false;
      processQueue(error, null);
      redirectToLogin();
      return Promise.reject(error);
    }

    // Handle concurrent requests during refresh
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => instance(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    // Attempt token refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await instance.post(AUTH_ENDPOINTS.REFRESH);
      isRefreshing = false;
      processQueue(null, true);
      return instance(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      processQueue(refreshError, null);
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

// Export the axios instance and the combined ENDPOINTS
export default instance;
