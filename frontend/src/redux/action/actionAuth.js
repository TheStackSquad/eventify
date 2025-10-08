//frontend/src/redux/action/actionAuth.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import { toastAlert } from "@/components/common/toast/toastAlert";

// Action type constants for consistency
const ACTION_TYPES = {
  SIGNIN: "auth/signinUser",
  RESTORE_SESSION: "auth/restoreSession",
  LOGOUT: "auth/logoutUser",
};

export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async (formData, { rejectWithValue }) => {
    // LOG A: Trace the data received from the component
    console.log("LOG A: signupUser Thunk received formData:", formData);

    try {
      // LOG B: Trace the API endpoint and method before the call
      console.log(
        "LOG B: Attempting POST request to /signup with data:",
        formData
      );

      // API call to the Go backend, handles CORS/cookies via axiosConfig
      const response = await axios.post("/auth/signup", formData);

      // LOG C: Trace the raw response received from the backend
      console.log("LOG C: API call successful. Raw response:", response);

      // Success notification triggered directly by the thunk
      toastAlert.success(
        response.data.message || "Signup successful! Redirecting to login."
      );

      // Return data needed for the signup success handler (usually just status)
      // LOG D: Trace the final data returned by the thunk
      console.log("LOG D: Thunk returning successful data:", response.data);
      return response.data;
    } catch (error) {
      // LOG C (Error): Trace the error object received from the API/network
      console.error("LOG C (Error): API call failed. Error object:", error);

      // Extract specific message from the backend response or use a default
      const errorMessage =
        error.response?.data?.message ||
        "Server connection error. Please try again.";

      // LOG D (Error): Trace the specific message extracted for the user
      console.log("LOG D (Error): Extracted error message:", errorMessage);

      // Error notification
      toastAlert.error(errorMessage);

      // Reject the promise to trigger the 'rejected' case in the reducer and stop component execution
      return rejectWithValue({ message: errorMessage });
    }
  }
);

// signinUser with error handling
export const signinUser = createAsyncThunk(
  ACTION_TYPES.SIGNIN,
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post("/auth/login", formData);
      toastAlert.success("Welcome back to Eventify!");

      // Return structured data for consistent state management
      return {
        user: response.data.user,
        message: response.data.message,
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Invalid credentials or server error.";
      toastAlert.error(errorMessage);
      return rejectWithValue({
        message: errorMessage,
        code: error.response?.status,
      });
    }
  }
);

// restoreSession with state management
export const restoreSession = createAsyncThunk(
  ACTION_TYPES.RESTORE_SESSION,
  async (_, { rejectWithValue }) => {
    console.log(
      "[restoreSession Thunk] Starting session restoration attempt..."
    );
    try {
      console.log("[restoreSession Thunk] Calling GET /auth/me..."); // If the Go router fix is applied, this should now return 200 (authenticated) or 401 (unauthenticated)
      const response = await axios.get("/auth/me");
      console.log(
        "[restoreSession Thunk] API Success (200 OK). User restored."
      );
      return {
        user: response.data,
        restored: true,
      };
    } catch (error) {
      const status = error.response?.status; // Differentiate between network errors and auth failures
      const isAuthError = status === 401;

      if (isAuthError) {
        console.log(
          `[restoreSession Thunk] Session expired or invalid (401). State will be set to failed.`
        );
      } else if (status) {
        console.error(
          `[restoreSession Thunk] API returned error status: ${status}`
        );
      } else {
        console.error(
          `[restoreSession Thunk] Network error during session restore:`,
          error.message
        );
      }
      return rejectWithValue({
        message: isAuthError ? "Session expired" : "Session restoration failed",
        silent: true,
        isAuthError,
      });
    }
  }
);

//logoutUser with state cleanup
export const logoutUser = createAsyncThunk(
  ACTION_TYPES.LOGOUT,
  async (_, { rejectWithValue }) => {
    try {
      await axios.post("/auth/logout");
      toastAlert.info("You have been logged out.");

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Even on server error, we clear client state
      toastAlert.error("Error logging out on server, clearing local session.");
      return rejectWithValue({
        message: error.response?.data?.message || "Logout failed.",
        clearState: true,
      });
    }
  }
);
