// frontend/src/redux/action/eventAction.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import toastAlert from "@/components/common/toast/toastAlert";
import {
  REDUX_ACTION_TYPES,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/utils/constants/globalConstants";

export const createEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.CREATE_EVENT,
  async (eventData, { rejectWithValue }) => {
    console.log("Data IN redux:", eventData);
    try {
      const response = await axios.post(API_ENDPOINTS.EVENTS.CREATE, eventData);
      toastAlert("success", SUCCESS_MESSAGES.EVENT_CREATED);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.CREATE_EVENT_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const fetchUserEvents = createAsyncThunk(
  REDUX_ACTION_TYPES.FETCH_USER_EVENTS,
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.EVENTS.MY_EVENTS);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_EVENTS_FAILED;
      return rejectWithValue({ message });
    }
  }
);

export const fetchEventAnalytics = createAsyncThunk(
  REDUX_ACTION_TYPES.FETCH_EVENT_ANALYTICS,
  async (eventId, { rejectWithValue }) => {
    try {
      const endpoint = API_ENDPOINTS.EVENTS.ANALYTICS.replace(":id", eventId);
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_ANALYTICS_FAILED;
      return rejectWithValue({ message });
    }
  }
);

export const getEventById = createAsyncThunk(
  REDUX_ACTION_TYPES.GET_EVENT_BY_ID,
  async (eventId, { rejectWithValue }) => {
    try {
      // Use string replacement
      const endpoint = API_ENDPOINTS.EVENTS.GET_BY_ID.replace(':eventId', eventId);
      console.log('🔍 Fetching event from:', endpoint); // Debug log
      
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.FETCH_EVENT_FAILED;
      toastAlert.error(message); // FIX: Use .error method
      return rejectWithValue({ message });
    }
  }
);

export const updateEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.UPDATE_EVENT,
  async ({ eventId, updates }, { rejectWithValue }) => {
    try {
      const endpoint = API_ENDPOINTS.EVENTS.UPDATE.replace(":id", eventId);
      const response = await axios.put(endpoint, updates);
      toastAlert("success", SUCCESS_MESSAGES.EVENT_UPDATED);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.UPDATE_EVENT_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const deleteEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.DELETE_EVENT,
  async (eventId, { rejectWithValue }) => {
    try {
      const endpoint = API_ENDPOINTS.EVENTS.DELETE.replace(":id", eventId);
      await axios.delete(endpoint);
      toastAlert("success", SUCCESS_MESSAGES.EVENT_DELETED);
      return { eventId };
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.DELETE_EVENT_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const publishEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.PUBLISH_EVENT,
  async ({ eventId, isPublished }, { rejectWithValue }) => {
    try {
      // Note: This endpoint might need to be added to API_ENDPOINTS if it exists
      const response = await axios.patch(`/events/${eventId}/publish`, {
        isPublished,
      });

      toastAlert(
        "success",
        isPublished ? "Event published! 🚀" : "Event unpublished"
      );
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update event status";
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);
