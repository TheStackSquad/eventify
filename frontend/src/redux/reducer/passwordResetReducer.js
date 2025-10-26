// frontend/src/redux/reducer/passwordResetReducer.js

import { createSlice } from "@reduxjs/toolkit";
import {
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
} from "@/redux/action/passwordResetAction";
import { STATUS } from "@/utils/constants/globalConstants";

// Step 1: Initial state definition
const initialState = {
  status: STATUS.IDLE, // Tracks the status of password reset operations
  tokenVerificationStatus: STATUS.IDLE, // Separate status for token verification
  error: null,
  successMessage: null,
  email: null, // Stores the email for which reset was requested
};

// Step 2: Create password reset slice
const passwordResetSlice = createSlice({
  name: "passwordReset",
  initialState,
  reducers: {
    // Step 3: Synchronous action to clear errors and reset state
    clearPasswordResetError(state) {
      state.error = null;
    },
    // Step 4: Clear entire state (useful when navigating away)
    clearPasswordResetState(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // ===================================================================
      // REQUEST PASSWORD RESET (Step 1: User submits email)
      // ===================================================================
      .addCase(requestPasswordReset.pending, (state) => {
        state.status = STATUS.LOADING;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.successMessage = action.payload.message;
        state.email = action.payload.email;
        state.error = null;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to send reset link.";
        state.successMessage = null;
      })

      // ===================================================================
      // VERIFY RESET TOKEN (Step 2: Validate token on reset page load)
      // ===================================================================
      .addCase(verifyResetToken.pending, (state) => {
        state.tokenVerificationStatus = STATUS.LOADING;
        state.error = null;
      })
      .addCase(verifyResetToken.fulfilled, (state, action) => {
        state.tokenVerificationStatus = STATUS.SUCCEEDED;
        state.error = null;
      })
      .addCase(verifyResetToken.rejected, (state, action) => {
        state.tokenVerificationStatus = STATUS.FAILED;
        state.error =
          action.payload?.message || "Invalid or expired reset link.";
      })

      // ===================================================================
      // RESET PASSWORD (Step 3: User submits new password)
      // ===================================================================
      .addCase(resetPassword.pending, (state) => {
        state.status = STATUS.LOADING;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.successMessage = action.payload.message;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to reset password.";
        state.successMessage = null;
      });
  },
});

// Step 5: Export actions and reducer
export const { clearPasswordResetError, clearPasswordResetState } =
  passwordResetSlice.actions;
export default passwordResetSlice.reducer;
