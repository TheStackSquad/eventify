// frontend/src/redux/action/passwordResetAction.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import toastAlert from "@/components/common/toast/toastAlert";

// Action type constants for consistency
const ACTION_TYPES = {
  REQUEST_RESET: "passwordReset/requestPasswordReset",
  VERIFY_TOKEN: "passwordReset/verifyResetToken",
  RESET_PASSWORD: "passwordReset/resetPassword",
};

export const requestPasswordReset = createAsyncThunk(
  ACTION_TYPES.REQUEST_RESET,
  async (formData, { rejectWithValue }) => {
    console.log("🔄 Requesting password reset for email:", formData.email);

    try {
      const response = await axios.post("/auth/forgot-password", formData);

      console.log("✅ Password reset request successful:", response.data);

      // Success notification
      toastAlert.success(
        response.data.message || "Password reset link sent to your email!"
      );

      return {
        message: response.data.message,
        email: formData.email,
      };
    } catch (error) {
      console.error("❌ Password reset request failed:", error);

      const errorMessage =
        error.response?.data?.message ||
        "Failed to send reset link. Please try again.";

      // Error notification
      toastAlert.error(errorMessage);

      return rejectWithValue({
        message: errorMessage,
        code: error.response?.status,
      });
    }
  }
);


export const verifyResetToken = createAsyncThunk(
  ACTION_TYPES.VERIFY_TOKEN,
  async ({ token }, { rejectWithValue }) => {
    console.log("🔍 Verifying reset token:", token);

    try {
      const response = await axios.get(`/auth/verify-reset-token`, {
        params: { token },
      });

      console.log("✅ Token verification successful:", response.data);

      return {
        valid: response.data.valid !== false,
        message: response.data.message,
      };
    } catch (error) {
      console.error("❌ Token verification failed:", error);

      const errorMessage =
        error.response?.data?.message ||
        "Invalid or expired reset link. Please request a new one.";

      // Silent error (no toast) since this is checked on page load
      return rejectWithValue({
        message: errorMessage,
        code: error.response?.status,
      });
    }
  }
);


export const resetPassword = createAsyncThunk(
  ACTION_TYPES.RESET_PASSWORD,
  async ({ token, newPassword }, { rejectWithValue }) => {
    console.log("🔄 Resetting password with token");

    try {
      const response = await axios.post("/auth/reset-password", {
        token,
        newPassword,
      });

      console.log("✅ Password reset successful:", response.data);

      // Success notification
      toastAlert.success(
        response.data.message || "Password reset successful! Please log in."
      );

      return {
        message: response.data.message,
      };
    } catch (error) {
      console.error("❌ Password reset failed:", error);

      const errorMessage =
        error.response?.data?.message ||
        "Failed to reset password. Please try again.";

      // Error notification
      toastAlert.error(errorMessage);

      return rejectWithValue({
        message: errorMessage,
        code: error.response?.status,
      });
    }
  }
);
