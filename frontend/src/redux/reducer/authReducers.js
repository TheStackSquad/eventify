// frontend/src/redux/reducer/authReducers.js

import { createSlice } from "@reduxjs/toolkit";
import {
  signupUser,
  signinUser,
  logoutUser,
  restoreSession,
} from "@/redux/action/actionAuth";
import { STATUS } from "@/utils/constants/globalConstants";

// Step 1: Initial state definition
const initialState = {
  user: null, // Stores user data (id, email, name, etc.)
  isAuthenticated: false,
  status: STATUS.IDLE, // Tracks the status of the last auth request
  error: null,
  isInitialized: false, // NEW: Tracks if session restoration has been attempted
};

// Step 2: Create auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Step 3: Synchronous action to clear errors
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Step 4: SIGNIN FULFILLED (Success)
      .addCase(signinUser.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
        state.isInitialized = true;
      })

      // Step 5: SIGNUP FULFILLED
      .addCase(signupUser.fulfilled, (state) => {
        state.status = STATUS.SUCCEEDED;
        state.error = null;
      })

      // Step 6: NEW - RESTORE SESSION FULFILLED
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
        state.isInitialized = true;
      })

      // Step 7: NEW - RESTORE SESSION REJECTED
      .addCase(restoreSession.rejected, (state, action) => {
        // Session restoration failed - user is not logged in
        state.status = STATUS.IDLE;
        state.isAuthenticated = false;
        state.user = null;
        state.isInitialized = true;
        // Don't set error for silent failures
        if (!action.payload?.silent) {
          state.error = action.payload?.message || null;
        }
      })

      // Step 8: LOGOUT FULFILLED
      .addCase(logoutUser.fulfilled, (state) => {
        // Reset the state entirely on logout
        Object.assign(state, { ...initialState, isInitialized: true });
      })

      // Step 9: LOGOUT REJECTED (clear state anyway for security)
      .addCase(logoutUser.rejected, (state, action) => {
        // If logout fails but clearState flag is set, still clear
        if (action.payload?.clearState) {
          Object.assign(state, { ...initialState, isInitialized: true });
        } else {
          state.status = STATUS.FAILED;
          state.error = action.payload?.message || "Logout failed.";
        }
      })

      // Step 10: PENDING (Loading) - Matcher for all auth thunks
      .addMatcher(
        (action) =>
          action.type.endsWith("/pending") && action.type.startsWith("auth/"),
        (state) => {
          state.status = STATUS.LOADING;
          state.error = null;
        }
      )

      // Step 11: REJECTED (Failure) - Matcher for all auth thunks
      .addMatcher(
        (action) =>
          action.type.endsWith("/rejected") &&
          action.type.startsWith("auth/") &&
          !action.type.includes("restoreSession") && // Already handled above
          !action.type.includes("logoutUser"), // Already handled above
        (state, action) => {
          state.status = STATUS.FAILED;
          state.error = action.payload?.message || "Authentication failed.";

          // If signin fails, ensure no phantom user data remains
          if (action.type === signinUser.rejected.type) {
            state.isAuthenticated = false;
            state.user = null;
          }
        }
      );
  },
});

// Step 12: Export actions and reducer
export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
