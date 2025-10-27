// frontend/src/redux/reducer/feedbackReducer.js

import { createSlice } from "@reduxjs/toolkit";
import {
  createFeedback,
  fetchAllFeedback,
  deleteFeedback,
} from "../action/feedbackAction";
import globalConstants from "@/utils/constants/globalConstants";

const { STATUS } = globalConstants;

const initialState = {
  feedbackList: [],
  createStatus: STATUS.IDLE,
  fetchStatus: STATUS.IDLE,
  deleteStatus: STATUS.IDLE,
  error: null,
};

const feedbackSlice = createSlice({
  name: "feedback",
  initialState,
  reducers: {
    resetCreateFeedbackStatus: (state) => {
      state.createStatus = STATUS.IDLE;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ========== CREATE FEEDBACK ==========
    builder
      .addCase(createFeedback.pending, (state) => {
        state.createStatus = STATUS.LOADING;
        state.error = null;
      })
      .addCase(createFeedback.fulfilled, (state, action) => {
        state.createStatus = STATUS.SUCCEEDED;
        state.error = null;
        // Optionally add to feedbackList if admin view is active
        // state.feedbackList.unshift(action.payload);
      })
      .addCase(createFeedback.rejected, (state, action) => {
        state.createStatus = STATUS.FAILED;
        state.error = action.payload || "Failed to submit feedback";
      });

    // ========== FETCH ALL FEEDBACK ==========
    builder
      .addCase(fetchAllFeedback.pending, (state) => {
        state.fetchStatus = STATUS.LOADING;
        state.error = null;
      })
      .addCase(fetchAllFeedback.fulfilled, (state, action) => {
        state.fetchStatus = STATUS.SUCCEEDED;
        state.feedbackList = action.payload;
        state.error = null;
      })
      .addCase(fetchAllFeedback.rejected, (state, action) => {
        state.fetchStatus = STATUS.FAILED;
        state.error = action.payload || "Failed to fetch feedback";
      });

    // ========== DELETE FEEDBACK ==========
    builder
      .addCase(deleteFeedback.pending, (state) => {
        state.deleteStatus = STATUS.LOADING;
        state.error = null;
      })
      .addCase(deleteFeedback.fulfilled, (state, action) => {
        state.deleteStatus = STATUS.SUCCEEDED;
        // Remove deleted feedback from list
        state.feedbackList = state.feedbackList.filter(
          (feedback) => feedback.id !== action.payload
        );
        state.error = null;
      })
      .addCase(deleteFeedback.rejected, (state, action) => {
        state.deleteStatus = STATUS.FAILED;
        state.error = action.payload || "Failed to delete feedback";
      });
  },
});

export const { resetCreateFeedbackStatus } = feedbackSlice.actions;
export default feedbackSlice.reducer;
