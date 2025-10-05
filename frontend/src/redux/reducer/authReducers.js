//frontend/src/redux/reducer/authReducers.js

import { createSlice } from "@reduxjs/toolkit";
import { signupUser, signinUser, logoutUser } from "@/redux/action/actionAuth";
import { STATUS } from "@/redux/lib/constants";

const initialState = {
  user: null, // Stores user data (id, email, name)
  isAuthenticated: false,
  status: STATUS.IDLE, // Tracks the status of the last auth request
  error: null,
};


const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Synchronous action to clear errors, useful for form display
    clearAuthError(state) {
      state.error = null;
    },
  }, 
 extraReducers: (builder) => {
    builder
      // --- 1. All addCase calls (Success & Failure for specific thunks) ---

      // --- SIGNIN FULFILLED (Success) ---
      .addCase(signinUser.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })

      // --- SIGNUP FULFILLED ---
      .addCase(signupUser.fulfilled, (state) => {
        state.status = STATUS.IDLE;
        state.error = null;
      })

      // --- LOGOUT FULFILLED ---
      .addCase(logoutUser.fulfilled, (state) => {
        // Reset the state entirely on logout
        Object.assign(state, initialState);
      })

      // --- 2. All addMatcher calls (must come after addCase calls) ---

      // --- PENDING (Loading) ---
      // Uses a matcher to handle 'pending' state for all auth thunks
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state) => {
          state.status = STATUS.LOADING;
          state.error = null;
        }
      )

      // --- REJECTED (Failure for all) ---
      // Uses a matcher to handle 'rejected' state for all auth thunks
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action) => {
          state.status = STATUS.FAILED;
          state.error = action.payload?.message || "Authentication failed.";

          // If the rejection is a critical failure (like signin fail), ensure no phantom user data remains
          if (action.type === signinUser.rejected.type) {
            state.isAuthenticated = false;
            state.user = null;
          }
        }
      );
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
