//frontend/src/redux/action/actionAuth.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import { toastAlert } from "@/components/common/toast/toastAlert";

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

export const signinUser = createAsyncThunk(
  "auth/signinUser",
  async (formData, { rejectWithValue }) => {
    try {
      // API call to the Go backend
      const response = await axios.post("/auth/login", formData);

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
