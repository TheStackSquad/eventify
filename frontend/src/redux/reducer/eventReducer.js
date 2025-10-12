// frontend/src/redux/reducer/eventReducer.js
import { createSlice } from "@reduxjs/toolkit";
import {
  createEvent,
  fetchUserEvents,
  fetchEventAnalytics,
  updateEvent,
  deleteEvent,
  publishEvent,
  getEventById, // ADD THIS IMPORT
} from "@/redux/action/eventAction";
import { STATUS, EVENT_DEFAULTS } from "@/utils/constants/globalConstants";

const initialState = EVENT_DEFAULTS.INITIAL_STATE;

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

    // NEW: Clear current event (for form editing)
    clearCurrentEvent(state) {
      state.currentEvent = null;
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
        state.userEvents.unshift(action.payload.event);
        state.error = null;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to create event";
      })

      // GET EVENT BY ID (NEW) - for form editing
      .addCase(getEventById.pending, (state) => {
        state.status = STATUS.LOADING;
        state.error = null;
      })
      .addCase(getEventById.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.currentEvent = action.payload; // Store for form pre-fill
        state.error = null;
      })
      .addCase(getEventById.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to fetch event";
        state.currentEvent = null;
      })

      // FETCH USER EVENTS
      .addCase(fetchUserEvents.pending, (state) => {
        state.status = STATUS.LOADING;
        state.error = null;
      })
      .addCase(fetchUserEvents.fulfilled, (state, action) => {
        state.status = STATUS.SUCCEEDED;
        state.userEvents = action.payload || [];
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
        const updatedEvent = action.payload.event;

        // Update in userEvents array
        const index = state.userEvents.findIndex(
          (e) => e.id === updatedEvent.id
        );
        if (index !== -1) {
          state.userEvents[index] = updatedEvent;
        }

        // Update selectedEvent if it's the same event
        if (state.selectedEvent?.id === updatedEvent.id) {
          state.selectedEvent = updatedEvent;
        }

        // Update currentEvent if it's the same event
        if (state.currentEvent?.id === updatedEvent.id) {
          state.currentEvent = updatedEvent;
        }
      })

      // DELETE EVENT
      .addCase(deleteEvent.fulfilled, (state, action) => {
        const deletedEventId = action.payload.eventId;
        state.userEvents = state.userEvents.filter(
          (e) => e.id !== deletedEventId
        );

        // Clear selected/current if they match the deleted event
        if (state.selectedEvent?.id === deletedEventId) {
          state.selectedEvent = null;
          state.analytics = initialState.analytics;
        }
        if (state.currentEvent?.id === deletedEventId) {
          state.currentEvent = null;
        }
      })

      // PUBLISH EVENT
      .addCase(publishEvent.fulfilled, (state, action) => {
        const publishedEvent = action.payload.event;
        const index = state.userEvents.findIndex(
          (e) => e.id === publishedEvent.id
        );
        if (index !== -1) {
          state.userEvents[index] = publishedEvent;
        }
        if (state.selectedEvent?.id === publishedEvent.id) {
          state.selectedEvent = publishedEvent;
        }
        if (state.currentEvent?.id === publishedEvent.id) {
          state.currentEvent = publishedEvent;
        }
      });
  },
});

export const {
  clearEventError,
  setSelectedEvent,
  clearSelectedEvent,
  clearCurrentEvent,
} = eventSlice.actions;
export default eventSlice.reducer;
