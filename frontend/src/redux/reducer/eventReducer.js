//frontend/src/redux/reducer/eventReducer.js

import { createSlice } from "@reduxjs/toolkit";
import {
  createEvent,
  fetchUserEvents,
  fetchEventAnalytics,
  updateEvent,
  deleteEvent,
  publishEvent,
} from "@/redux/action/eventAction";
import { STATUS } from "@/redux/lib/constants";

const initialState = {
  // User's created events
  userEvents: [],

  // Currently selected event for detailed view
  selectedEvent: null,

  // Analytics data for selected event
  analytics: {
    totalRevenue: 0,
    ticketsSold: 0,
    ticketsRemaining: 0,
    viewCount: 0,
  },

  // Status tracking
  status: STATUS.IDLE,
  analyticsStatus: STATUS.IDLE,
  error: null,
};

const eventSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    // Clear errors
    clearEventError(state) {
      state.error = null;
    },

    // Set selected event for viewing/editing
    setSelectedEvent(state, action) {
      state.selectedEvent = action.payload;
    },

    // Clear selected event
    clearSelectedEvent(state) {
      state.selectedEvent = null;
      state.analytics = initialState.analytics;
    },
  },
  extraReducers: (builder) => {
    builder
      // CREATE EVENT
      .addCase(createEvent.pending, (state) => {
        state.status = STATUS.LOADING;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.userEvents.unshift(action.payload.event); // Add to beginning
        state.error = null;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to create event";
      })

      // FETCH USER EVENTS
      .addCase(fetchUserEvents.pending, (state) => {
        state.status = STATUS.LOADING;
        state.error = null;
      })
      .addCase(fetchUserEvents.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.userEvents = action.payload.events || [];
        state.error = null;
      })
      .addCase(fetchUserEvents.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to fetch events";
      })

      // FETCH EVENT ANALYTICS
      .addCase(fetchEventAnalytics.pending, (state) => {
        state.analyticsStatus = STATUS.LOADING;
      })
      .addCase(fetchEventAnalytics.fulfilled, (state, action) => {
        state.analyticsStatus = STATUS.SUCCEEDED;
        state.analytics = action.payload.analytics;
      })
      .addCase(fetchEventAnalytics.rejected, (state, action) => {
        state.analyticsStatus = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to fetch analytics";
      })

      // UPDATE EVENT
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.userEvents.findIndex(
          (e) => e.id === action.payload.event.id
        );
        if (index !== -1) {
          state.userEvents[index] = action.payload.event;
        }
        if (state.selectedEvent?.id === action.payload.event.id) {
          state.selectedEvent = action.payload.event;
        }
      })

      // DELETE EVENT
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.userEvents = state.userEvents.filter(
          (e) => e.id !== action.payload.eventId
        );
        if (state.selectedEvent?.id === action.payload.eventId) {
          state.selectedEvent = null;
          state.analytics = initialState.analytics;
        }
      })

      // PUBLISH EVENT
      .addCase(publishEvent.fulfilled, (state, action) => {
        const index = state.userEvents.findIndex(
          (e) => e.id === action.payload.event.id
        );
        if (index !== -1) {
          state.userEvents[index] = action.payload.event;
        }
        if (state.selectedEvent?.id === action.payload.event.id) {
          state.selectedEvent = action.payload.event;
        }
      });
  },
});

export const { clearEventError, setSelectedEvent, clearSelectedEvent } =
  eventSlice.actions;
export default eventSlice.reducer;
