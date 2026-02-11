// frontend/src/axiosConfig/axios.js

import axios from "axios";
import { API_ENDPOINTS } from "@/utils/constants/globalConstants";
import { createResponseInterceptor } from "./interceptorService";
import { setBackendInstanceRef } from "./tokenService";

// --- Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
const IS_DEV = process.env.NODE_ENV === "development";

if (IS_DEV) console.log("Axios Base URL:", API_BASE_URL);

// CSRF Token Helper
const getCSRFToken = () => {
  if (typeof document === "undefined") return null; // SSR safety

  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf_token") {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Copy static methods from original axios to an instance
const injectStaticMethods = (instance) => {
  instance.isCancel = axios.isCancel;
  instance.CancelToken = axios.CancelToken;
  instance.isAxiosError = axios.isAxiosError;
  return instance;
};

/**
 * BACKEND API INSTANCE
 * Communicates with the Go Gin server
 */
export const backendInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Required for HttpOnly cookies
});
injectStaticMethods(backendInstance);

/**
 * FRONTEND API INSTANCE
 * Communicates with local Next.js API routes (e.g., Vercel Blob)
 */
export const frontendInstance = axios.create({
  baseURL: "", // Empty for same-origin Next.js routes
  timeout: 60000, // Higher timeout for image uploads (60s)
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
injectStaticMethods(frontendInstance);

// --- APPLY INTERCEPTORS ---

// ✅ NEW: Request Interceptor for CSRF Token Injection
backendInstance.interceptors.request.use(
  (config) => {
    // Only attach CSRF token for state-changing methods
    const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];

    if (stateChangingMethods.includes(config.method?.toUpperCase())) {
      const csrfToken = getCSRFToken();

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;

        if (IS_DEV) {
          console.log(
            `🛡️ [CSRF] Token attached to ${config.method?.toUpperCase()} ${config.url}`,
          );
        }
      } else if (IS_DEV) {
        console.warn(
          `⚠️ [CSRF] No token found for ${config.method?.toUpperCase()} ${config.url}`,
        );
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Backend Response Interceptor (Handles token refreshes)
backendInstance.interceptors.response.use((response) => {
  if (IS_DEV) {
    console.log("Backend Success:", {
      status: response.status,
      url: response.config.url,
    });
  }
  return response;
}, createResponseInterceptor(backendInstance));

// Frontend Response Interceptor (Basic error handling)
frontendInstance.interceptors.response.use(
  (response) => {
    if (IS_DEV) {
      console.log("Frontend Success:", {
        status: response.status,
        url: response.config.url,
      });
    }
    return response;
  },
  (error) => {
    // ✅ NEW: Handle CSRF errors specifically
    if (
      error.response?.data?.code === "CSRF_TOKEN_MISSING" ||
      error.response?.data?.code === "CSRF_TOKEN_INVALID"
    ) {
      console.error("🚨 CSRF Protection Error:", {
        code: error.response.data.code,
        message: error.response.data.message,
      });

      // Dispatch custom event for components to handle
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("csrfError", {
            detail: {
              code: error.response.data.code,
              message: error.response.data.message,
            },
          }),
        );
      }
    }

    console.error("Frontend API Error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.error || error.message,
    });
    return Promise.reject(error);
  },
);

// Set reference for tokenService to use backendInstance for refreshes
setBackendInstanceRef(backendInstance);

// --- EXPORTS ---
export default backendInstance;
export const ENDPOINTS = { ...API_ENDPOINTS };
