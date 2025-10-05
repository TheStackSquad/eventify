//frontend/src/redux/action/actionAuth.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import { toastAlert } from "@/components/common/toast/toastAlert";

export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async (formData, { rejectWithValue }) => {
    try {
      // API call to the Go backend, handles CORS/cookies via axiosConfig
      const response = await axios.post("/signup", formData);

      // Success notification triggered directly by the thunk
      toastAlert.success(
        response.data.message || "Signup successful! Redirecting to login."
      );

      // Return data needed for the signup success handler (usually just status)
      return response.data;
    } catch (error) {
      // Extract specific message from the backend response or use a default
      const errorMessage =
        error.response?.data?.message ||
        "Server connection error. Please try again.";

      // Error notification
      toastAlert.error(errorMessage);

      // Reject the promise to trigger the 'rejected' case in the reducer and stop component execution
      return rejectWithValue({ message: errorMessage });
    }
  }
);

/**
 * Handles user sign-in via POST /login
 * Expects the Go backend to set an HttpOnly JWT cookie on success.
 */
export const signinUser = createAsyncThunk(
  "auth/signinUser",
  async (formData, { rejectWithValue }) => {
    try {
      // API call to the Go backend
      const response = await axios.post("/login", formData);

      // The backend should handle setting the secure HttpOnly cookie.
      toastAlert.success("Welcome back to Eventify!");

      // Return non-sensitive user data for state consumption
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Invalid credentials or server error.";
      toastAlert.error(errorMessage);
      return rejectWithValue({ message: errorMessage });
    }
  }
);

/**
 * Handles user logout via POST /logout
 * Expects the Go backend to clear the HttpOnly JWT cookie.
 */
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      // Request to server to invalidate session/clear cookie
      await axios.post("/logout");

      // Notification
      toastAlert.info("You have been logged out.");
      return {};
    } catch (error) {
      // Even if the server fails, we clear client state for security purposes
      toastAlert.error("Error logging out on server, clearing local session.");
      return rejectWithValue(error.response?.data?.message || "Logout failed.");
    }
  }
);
