//frontend/src/redux/action/reviewAction.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  API_ENDPOINTS,
  REDUX_ACTION_TYPES,
} from "@/utils/constants/globalConstants";
import axios from "@/axiosConfig/axios";

/**
 * Create a review for a vendor (supports both authenticated and anonymous users)
 */
export const createReview = createAsyncThunk(
  REDUX_ACTION_TYPES.CREATE_REVIEW,
  async ({ vendorId, rating, content }, { rejectWithValue }) => {
    try {
      console.log("🔄 createReview action called with:", {
        vendorId,
        rating,
        content,
      });

      const apiUrl = API_ENDPOINTS.REVIEWS.CREATE.replace(
        ":vendor_id",
        vendorId
      );

      console.log("🌐 Final API URL:", apiUrl);
      console.log("📦 Request payload:", { rating, content });

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const response = await axios.post(
        apiUrl,
        {
          rating,
          content,
        },
        config
      );

      console.log("✅ Review created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ createReview error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        fullError: error,
      });

      const message =
        error.response?.data?.message || "Failed to submit review.";
      return rejectWithValue(message);
    }
  }
);

/**
 * Get all reviews for a vendor (public sees approved, admin sees all)
 */
export const getVendorReviews = createAsyncThunk(
  REDUX_ACTION_TYPES.GET_VENDOR_REVIEWS,
  async (vendorId, { rejectWithValue }) => {
    try {
      console.log("🔄 getVendorReviews action called for vendor:", vendorId);

      const apiUrl = API_ENDPOINTS.REVIEWS.GET_VENDOR.replace(
        ":vendor_id",
        vendorId
      );

      console.log("🌐 Final API URL:", apiUrl);

      const response = await axios.get(apiUrl);

      console.log("✅ Reviews fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ getVendorReviews error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        fullError: error,
      });

      const message =
        error.response?.data?.message || "Failed to fetch reviews.";
      return rejectWithValue(message);
    }
  }
);

/**
 * Update review approval status (Admin only)
 */
export const updateReviewStatus = createAsyncThunk(
  REDUX_ACTION_TYPES.UPDATE_REVIEW_STATUS,
  async ({ reviewId, isApproved }, { rejectWithValue }) => {
    try {
      console.log("🔄 updateReviewStatus action called with:", {
        reviewId,
        isApproved,
      });

      const apiUrl = API_ENDPOINTS.ADMIN_REVIEWS.UPDATE_STATUS.replace(
        ":id",
        reviewId
      );

      console.log("🌐 Final API URL:", apiUrl);
      console.log("📦 Request payload:", { isApproved });

      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const response = await axios.patch(
        apiUrl,
        {
          isApproved,
        },
        config
      );

      console.log("✅ Review status updated successfully:", response.data);
      return { reviewId, isApproved, ...response.data };
    } catch (error) {
      console.error("❌ updateReviewStatus error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        fullError: error,
      });

      const message =
        error.response?.data?.message || "Failed to update review status.";
      return rejectWithValue(message);
    }
  }
);
