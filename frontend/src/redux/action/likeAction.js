// frontend/src/redux/action/likeAction.js

import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
// 🎯 FIX: Import API_ENDPOINTS correctly from the globalConstants file
import api from "@/axiosConfig/axios";
import { API_ENDPOINTS } from "@/utils/constants/globalConstants";

// 1. Action for the optimistic UI update
export const toggleLikeOptimistic = createAction("likes/toggleLikeOptimistic");

// 2. Thunk for the API call and final state update (Command)
export const toggleEventLike = createAsyncThunk(
  "likes/toggleEventLike",
  async (eventId, { getState, dispatch, rejectWithValue }) => {
    // 🎯 Helper function to replace the placeholder
    const getLikeEndpoint = (id) =>
      API_ENDPOINTS.EVENTS.LIKE.replace(":eventId", id);

    try {
      const endpoint = getLikeEndpoint(eventId);
      const response = await api.post(
        endpoint, // 🎯 Use the correctly constructed, abstracted endpoint
        {}
      );

      return {
        eventId,
        newLikeCount: response.data.newLikeCount,
        isLiked: response.data.isLiked,
      };
    } catch (error) {
      // ... (error handling remains the same)
      const currentState = getState();
      const event = currentState.events.userEvents.find(
        (e) => e.id === eventId
      );

      return rejectWithValue({
        eventId,
        wasLikedBefore: event ? event.isLikedByUser : false,
      });
    }
  }
);
