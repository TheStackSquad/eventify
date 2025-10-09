//frontend/src/redux/action/eventAction.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import toastAlert from '@/components/common/toast/toastAlert';

// Action type constants
const ACTION_TYPES = {
  CREATE_EVENT: "events/createEvent",
  FETCH_USER_EVENTS: "events/fetchUserEvents",
  FETCH_EVENT_ANALYTICS: "events/fetchEventAnalytics",
  UPDATE_EVENT: "events/updateEvent",
  DELETE_EVENT: "events/deleteEvent",
  PUBLISH_EVENT: "events/publishEvent",
};

export const createEvent = createAsyncThunk(
  ACTION_TYPES.CREATE_EVENT,
  async (eventData, { rejectWithValue }) => {
     console.log("Data IN redux:", eventData);
    try {
      const response = await axios.post("/events/create", eventData);
      
      // toastAlert("success", "Event created successfully! 🎉");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to create event";
      // toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

/**
 * Fetch all events created by the authenticated user
 */
export const fetchUserEvents = createAsyncThunk(
  ACTION_TYPES.FETCH_USER_EVENTS,
  async (_, { rejectWithValue }) => {
    try {
      // 1. HTTP Request
      const response = await axios.get("/events/my-events");
      // 2. Success Return
      return response.data; // This data becomes the `payload` for the 'fulfilled' action
    } catch (error) {
      // 3. Error Handling
      const message = error.response?.data?.message || "Failed to fetch events";
      return rejectWithValue({ message }); // This payload becomes the `payload` for the 'rejected' action
    }
  }
);
/**
 * Fetch analytics for a specific event (tickets sold, revenue, etc.)
 */
export const fetchEventAnalytics = createAsyncThunk(
  ACTION_TYPES.FETCH_EVENT_ANALYTICS,
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/events/${eventId}/analytics`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch analytics";
      return rejectWithValue({ message });
    }
  }
);

/**
 * Update an existing event
 */
export const updateEvent = createAsyncThunk(
  ACTION_TYPES.UPDATE_EVENT,
  async ({ eventId, updates }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/events/${eventId}`, updates);
      
      toastAlert("success", "Event updated successfully!");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update event";
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

/**
 * Delete an event
 */
export const deleteEvent = createAsyncThunk(
  ACTION_TYPES.DELETE_EVENT,
  async (eventId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/events/${eventId}`);
      
      toastAlert("success", "Event deleted successfully");
      return { eventId };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to delete event";
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

/**
 * Publish/unpublish an event
 */
export const publishEvent = createAsyncThunk(
  ACTION_TYPES.PUBLISH_EVENT,
  async ({ eventId, isPublished }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/events/${eventId}/publish`, {
        isPublished,
      });
      
      toastAlert(
        "success",
        isPublished ? "Event published! 🚀" : "Event unpublished"
      );
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update event status";
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);
