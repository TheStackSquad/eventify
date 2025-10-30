// frontend/src/axiosConfig/axios.js

import axios from "axios";
import {
  API_ENDPOINTS,
  ROUTES,
  REDIRECT_PATHS,
} from "@/utils/constants/globalConstants";

// Step 1: Define the base URL using environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

console.log("Axios Base URL set to:", API_BASE_URL);

// 3. EXPORT ALL ENDPOINTS: Exporting all endpoints from this file for easy use
export const ENDPOINTS = {
  ...API_ENDPOINTS, // Now includes all endpoints: AUTH, PAYMENTS, EVENTS, VENDORS, etc.
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
    if (originalRequest.url === API_ENDPOINTS.AUTH.REFRESH) {
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
      await instance.post(API_ENDPOINTS.AUTH.REFRESH);
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
