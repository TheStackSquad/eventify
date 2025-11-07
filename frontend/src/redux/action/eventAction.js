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

// Helper function to check for and handle the AbortError
const handleAbortError = (error, rejectWithValue) => {
  if (axios.isCancel(error) || error.name === "AbortError") {
    // Return a message that we can ignore in the component if needed
    return rejectWithValue({ message: "Request aborted", isAborted: true });
  }
};

export const createEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.CREATE_EVENT,
  // Destructure eventData and signal from the payload
  async ({ eventData, signal }, { rejectWithValue }) => {
    console.log("Data IN redux:", eventData);
    try {
      const response = await axios.post(
        API_ENDPOINTS.EVENTS.CREATE,
        eventData,
        { signal }
      ); // PASS SIGNAL
      toastAlert.success(SUCCESS_MESSAGES.EVENT_CREATED);
      return response.data;
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || ERROR_MESSAGES.CREATE_EVENT_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const fetchUserEvents = createAsyncThunk(
  REDUX_ACTION_TYPES.FETCH_USER_EVENTS,
  // Accept signal directly since there was no original argument
  async (signal, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.EVENTS.MY_EVENTS, {
        signal,
      }); // PASS SIGNAL
      return response.data;
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_EVENTS_FAILED;
      return rejectWithValue({ message });
    }
  }
);

// NEW: Fetch ALL events (for public event listing page)
export const fetchAllEvents = createAsyncThunk(
  REDUX_ACTION_TYPES.FETCH_ALL_EVENTS,
  // Accept signal directly since there was no original argument
  async (signal, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.EVENTS.BASE, { signal }); // PASS SIGNAL
      return response.data;
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_EVENTS_FAILED;
      return rejectWithValue({ message });
    }
  }
);

export const fetchEventAnalytics = createAsyncThunk(
  REDUX_ACTION_TYPES.FETCH_EVENT_ANALYTICS,
  // Destructure eventId and signal from the payload
  async ({ eventId, signal }, { rejectWithValue }) => {
    try {
      const endpoint = API_ENDPOINTS.EVENTS.ANALYTICS.replace(":id", eventId);
      const response = await axios.get(endpoint, { signal }); // PASS SIGNAL
      return response.data;
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_ANALYTICS_FAILED;
      return rejectWithValue({ message });
    }
  }
);

export const getEventById = createAsyncThunk(
  REDUX_ACTION_TYPES.GET_EVENT_BY_ID,
  // Destructure eventId and signal from the payload
  async ({ eventId, signal }, { rejectWithValue }) => {
    try {
      // Use string replacement
      const endpoint = API_ENDPOINTS.EVENTS.GET_BY_ID.replace(
        ":eventId",
        eventId
      );
      console.log("🔍 Fetching event from:", endpoint); // Debug log

      const response = await axios.get(endpoint, { signal }); // PASS SIGNAL
      return response.data;
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_EVENT_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const updateEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.UPDATE_EVENT,
  // Destructure eventId, updates, and signal from the payload
  async ({ eventId, updates, signal }, { rejectWithValue }) => {
    try {
      const endpoint = API_ENDPOINTS.EVENTS.UPDATE.replace(":id", eventId);
      const response = await axios.put(endpoint, updates, { signal }); // PASS SIGNAL
      toastAlert.success(SUCCESS_MESSAGES.EVENT_UPDATED);
      return response.data;
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || ERROR_MESSAGES.UPDATE_EVENT_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const deleteEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.DELETE_EVENT,
  // Destructure eventId and signal from the payload
  async ({ eventId, signal }, { rejectWithValue }) => {
    try {
      const endpoint = API_ENDPOINTS.EVENTS.DELETE.replace(":id", eventId);
      await axios.delete(endpoint, { signal }); // PASS SIGNAL
      toastAlert.success(SUCCESS_MESSAGES.EVENT_DELETED);
      return { eventId };
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || ERROR_MESSAGES.DELETE_EVENT_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const publishEvent = createAsyncThunk(
  REDUX_ACTION_TYPES.PUBLISH_EVENT,
  // Destructure eventId, isPublished, and signal from the payload
  async ({ eventId, isPublished, signal }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `/events/${eventId}/publish`,
        { isPublished },
        { signal } // PASS SIGNAL
      );

      toastAlert(
        "success",
        isPublished ? "Event published! 🚀" : "Event unpublished"
      );

      return response.data;
    } catch (error) {
      handleAbortError(error, rejectWithValue); // Handle Abort

      const message =
        error.response?.data?.message || "Failed to update event status";
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);
