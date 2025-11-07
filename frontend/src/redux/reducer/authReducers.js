// frontend/src/redux/reducer/authReducers.js
import { createSlice } from "@reduxjs/toolkit";
import {
  signupUser,
  signinUser,
  logoutUser,
  verifySession, // ✅ Changed from restoreSession
  clearStaleAuthData, // ✅ New security action
} from "@/redux/action/actionAuth";
import { STATUS } from "@/utils/constants/globalConstants";

// Step 1: Enhanced initial state with security focus
const initialState = {
  user: null, // Only safe user data (id, name, email, is_admin)
  isAuthenticated: false,
  sessionChecked: false, // ✅ NEW: Tracks if we've verified with backend
  isSessionChecking: false, // ✅ NEW: Loading state for session verification
  status: STATUS.IDLE,
  error: null,
  isInitialized: false,
};

// Step 2: Create auth slice with security-focused reducers
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    // ✅ NEW: Manual session invalidation for security
    invalidateSession(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.sessionChecked = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // ✅ UPDATED: VERIFY SESSION FULFILLED
      .addCase(verifySession.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.isAuthenticated = true;
        state.user = action.payload.user; // Only safe data from action
        state.sessionChecked = true; // ✅ Critical for SessionProvider
        state.isSessionChecking = false;
        state.error = null;
        state.isInitialized = true;
      })

      // ✅ UPDATED: VERIFY SESSION REJECTED
      .addCase(verifySession.rejected, (state, action) => {
        state.status = STATUS.IDLE;
        state.isAuthenticated = false;
        state.user = null;
        state.sessionChecked = true; // ✅ We've completed the check
        state.isSessionChecking = false;
        state.isInitialized = true;

        // Only show errors for non-auth failures (network issues, etc.)
        if (!action.payload?.isAuthError) {
          state.error =
            action.payload?.message || "Session verification failed";
        }
      })

      // ✅ NEW: VERIFY SESSION PENDING
      .addCase(verifySession.pending, (state) => {
        state.isSessionChecking = true;
        state.status = STATUS.LOADING;
        state.error = null;
      })

      // ✅ NEW: CLEAR STALE AUTH DATA (Security)
      .addCase(clearStaleAuthData, (state) => {
        // Clear potentially compromised data but keep sessionChecked state
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
        state.sessionChecked = true; // We've attempted verification
      })

      // SIGNIN FULFILLED (Updated to set sessionChecked)
      .addCase(signinUser.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.sessionChecked = true; // ✅ Now verified
        state.error = null;
        state.isInitialized = true;
      })

      // SIGNUP FULFILLED
      .addCase(signupUser.fulfilled, (state) => {
        state.status = STATUS.SUCCEEDED;
        state.error = null;
      })

      // LOGOUT FULFILLED (Enhanced security)
      .addCase(logoutUser.fulfilled, (state) => {
        // Complete state reset on logout
        Object.assign(state, {
          ...initialState,
          sessionChecked: true, // We know user is logged out
          isInitialized: true,
        });
      })

      // LOGOUT REJECTED (Enhanced security)
      .addCase(logoutUser.rejected, (state, action) => {
        // Clear auth state even if logout API call fails
        if (action.payload?.clearState) {
          Object.assign(state, {
            ...initialState,
            sessionChecked: true,
            isInitialized: true,
          });
        } else {
          state.status = STATUS.FAILED;
          state.error = action.payload?.message || "Logout failed.";
        }
      })

      // PENDING - Matcher for all auth thunks (except verifySession)
      .addMatcher(
        (action) =>
          action.type.endsWith("/pending") &&
          action.type.startsWith("auth/") &&
          !action.type.includes("verifySession"), // Already handled above
        (state) => {
          state.status = STATUS.LOADING;
          state.error = null;
        }
      )

      // REJECTED - Matcher for all auth thunks (with exclusions)
      .addMatcher(
        (action) =>
          action.type.endsWith("/rejected") &&
          action.type.startsWith("auth/") &&
          !action.type.includes("verifySession") && // Already handled
          !action.type.includes("logoutUser"), // Already handled
        (state, action) => {
          state.status = STATUS.FAILED;
          state.error = action.payload?.message || "Authentication failed.";

          // Clear user data on signin failure
          if (action.type === signinUser.rejected.type) {
            state.isAuthenticated = false;
            state.user = null;
            state.sessionChecked = true; // We know auth state now
          }
        }
      );
  },
});

// Step 3: Export enhanced actions
export const { clearAuthError, invalidateSession } = authSlice.actions;
export default authSlice.reducer;
