// frontend/src/redux/action/actionAuth.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import toastAlert from "@/components/common/toast/toastAlert";
import {
  REDUX_ACTION_TYPES,
  API_ENDPOINTS,
} from "@/utils/constants/globalConstants";

export const signupUser = createAsyncThunk(
  // Use the constant for the action type
  REDUX_ACTION_TYPES.SIGNUP,
  async (formData, { rejectWithValue }) => {
    // LOG A: Trace the data received from the component
    console.log("LOG A: signupUser Thunk received formData:", formData);

    const { confirmPassword, ...apiPayload } = formData;

    try {
      // LOG B: Trace the API endpoint and method and the *cleaned* data
      console.log(
        "LOG B: Attempting POST request to",
        API_ENDPOINTS.AUTH.SIGNUP, // 👈 Use the constant
        "with CLEANED data:",
        apiPayload
      );

      // API call to the Go backend, handles CORS/cookies via axiosConfig
      const response = await axios.post(
        API_ENDPOINTS.AUTH.SIGNUP, // 👈 Use the constant
        apiPayload
      );

      // ... (Rest of signupUser thunk remains the same)

      return response.data;
    } catch (error) {
      // ... (Error handling remains the same)
      return rejectWithValue({ message: errorMessage });
    }
  }
);

// signinUser with error handling
export const signinUser = createAsyncThunk(
  // Use the constant for the action type
  REDUX_ACTION_TYPES.SIGNIN,
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        API_ENDPOINTS.AUTH.SIGNIN, // 👈 Use the constant
        formData
      );
      // ... (Rest of signinUser thunk remains the same)
      return {
        user: response.data.user,
        message: response.data.message,
      };
    } catch (error) {
      // ... (Error handling remains the same)
      return rejectWithValue({
        message: errorMessage,
        code: error.response?.status,
      });
    }
  }
);

// restoreSession with state management
export const restoreSession = createAsyncThunk(
  // Use the constant for the action type
  REDUX_ACTION_TYPES.RESTORE_SESSION,
  async (_, { rejectWithValue }) => {
    console.log(
      "[restoreSession Thunk] Starting session restoration attempt..."
    );
    try {
      console.log(
        "[restoreSession Thunk] Calling GET",
        API_ENDPOINTS.AUTH.ME, // 👈 Use the constant
        "..."
      );
      const response = await axios.get(
        API_ENDPOINTS.AUTH.ME // 👈 Use the constant
      );
      // ... (Rest of restoreSession thunk remains the same)
      return {
        user: response.data,
        restored: true,
      };
    } catch (error) {
      // ... (Error handling remains the same)
      return rejectWithValue({
        message: isAuthError ? "Session expired" : "Session restoration failed",
        silent: true,
        isAuthError,
      });
    }
  }
);

// logoutUser with state cleanup
export const logoutUser = createAsyncThunk(
  // Use the constant for the action type
  REDUX_ACTION_TYPES.LOGOUT,
  async (_, { rejectWithValue }) => {
    try {
      await axios.post(
        API_ENDPOINTS.AUTH.LOGOUT // 👈 Use the constant
      );
      // ... (Rest of logoutUser thunk remains the same)
      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // ... (Error handling remains the same)
      return rejectWithValue({
        message: error.response?.data?.message || "Logout failed.",
        clearState: true,
      });
    }
  }
);
