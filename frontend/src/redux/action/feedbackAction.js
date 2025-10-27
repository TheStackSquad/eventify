// frontend/src/redux/action/feedbackAction.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import globalConstants from "@/utils/constants/globalConstants";

const { REDUX_ACTION_TYPES, API_ENDPOINTS } = globalConstants;

// ========== CREATE FEEDBACK ==========
export const createFeedback = createAsyncThunk(
  REDUX_ACTION_TYPES.CREATE_FEEDBACK,
  async (feedbackData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        API_ENDPOINTS.FEEDBACK.CREATE,
        feedbackData,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to submit feedback";
      return rejectWithValue(errorMessage);
    }
  }
);

// ========== FETCH ALL FEEDBACK (ADMIN ONLY) ==========
export const fetchAllFeedback = createAsyncThunk(
  REDUX_ACTION_TYPES.FETCH_ALL_FEEDBACK,
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_FEEDBACK.GET_ALL, {
        withCredentials: true,
      });
      return response.data.feedback || [];
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to fetch feedback";
      return rejectWithValue(errorMessage);
    }
  }
);

// ========== DELETE FEEDBACK (ADMIN ONLY) ==========
export const deleteFeedback = createAsyncThunk(
  REDUX_ACTION_TYPES.DELETE_FEEDBACK,
  async (feedbackId, { rejectWithValue }) => {
    try {
      const endpoint = API_ENDPOINTS.ADMIN_FEEDBACK.DELETE.replace(
        ":id",
        feedbackId
      );
      await axios.delete(endpoint, {
        withCredentials: true,
      });
      return feedbackId;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to delete feedback";
      return rejectWithValue(errorMessage);
    }
  }
);

// ========== RESET CREATE FEEDBACK STATUS ==========
export const resetCreateFeedbackStatus = () => ({
  type: REDUX_ACTION_TYPES.RESET_CREATE_FEEDBACK_STATUS,
});
