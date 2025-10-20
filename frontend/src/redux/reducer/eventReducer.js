// frontend/src/redux/reducer/eventReducer.js
import { createSlice } from "@reduxjs/toolkit";
import * as eventActions from "@/redux/action/eventAction";
import { STATUS, EVENT_DEFAULTS } from "@/utils/constants/globalConstants";

// 1. IMPORT LIKE ACTIONS
import { toggleLikeOptimistic, toggleEventLike } from "@/redux/action/likeAction";

const initialState = EVENT_DEFAULTS.INITIAL_STATE;

// Debug: Check what actions are imported
console.log("🔍 [DEBUG] Imported eventActions:", eventActions);
console.log("🔍 [DEBUG] getEventById action:", eventActions.getEventById);
console.log("🔍 [DEBUG] createEvent action:", eventActions.createEvent);
console.log("🔍 [DEBUG] All action names:", Object.keys(eventActions));

const eventSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    // Clear errors
    clearEventError(state) {
      state.error = null;
    }, // Set selected event for viewing/editing

    setSelectedEvent(state, action) {
      state.selectedEvent = action.payload;
    }, // Clear selected event

    clearSelectedEvent(state) {
      state.selectedEvent = null;
      state.analytics = initialState.analytics;
    }, // NEW: Clear current event (for form editing)

    clearCurrentEvent(state) {
      state.currentEvent = null;
    },
  },
  extraReducers: (builder) => {
    console.log("🔍 [DEBUG] Building extraReducers...");

    // ====================================================================
    // 🛑 LIKE/UNLIKE LOGIC INTEGRATION 🛑
    // ====================================================================

    // 1. Optimistic Update (Immediate UI change)
    builder.addCase(toggleLikeOptimistic, (state, action) => {
      const eventId = action.payload;
      const event = state.userEvents.find((e) => e.id === eventId);
      if (event) {
        // Ensure likeCount exists before modification
        if (typeof event.likeCount !== "number") {
          // Initialize if missing (e.g., first time loading event)
          event.likeCount = event.isLikedByUser ? 1 : 0;
        }

        const isLiking = !event.isLikedByUser;

        event.isLikedByUser = isLiking;
        event.likeCount = event.likeCount + (isLiking ? 1 : -1);
        console.log(
          `🔍 [DEBUG] OPTIMISTIC: Event ${eventId} like status changed to ${isLiking}`
        );
      }
    });

    // 2. Server Confirmation (Success): Override optimistic value with server's final data
    builder.addCase(toggleEventLike.fulfilled, (state, action) => {
      const { eventId, newLikeCount, isLiked } = action.payload;
      const event = state.userEvents.find((e) => e.id === eventId);
      if (event) {
        event.likeCount = newLikeCount;
        event.isLikedByUser = isLiked;
        console.log(
          `🔍 [DEBUG] FULFILLED: Event ${eventId} confirmed. New count: ${newLikeCount}`
        );
      }
    });

    // 3. Server Confirmation (Failure/Rollback): Revert the optimistic change
    builder.addCase(toggleEventLike.rejected, (state, action) => {
      const { eventId } = action.payload;
      const event = state.userEvents.find((e) => e.id === eventId);
      if (event) {
        // Rollback: Flip the status back to what it was before the optimistic change
        // The optimistic action set it to `!wasLiking`. We flip it back to `wasLiking`.
        const wasLiking = event.isLikedByUser;

        event.isLikedByUser = !wasLiking;
        event.likeCount = event.likeCount + (wasLiking ? -1 : 1);

        // Set error for component to show rollback message
        state.error =
          action.error?.message ||
          "Failed to update like status. Rolling back change.";
        console.error(
          `🔍 [DEBUG] REJECTED: Event ${eventId} like failed. Rolled back.`
        );
      }
    });

    // ====================================================================
    // 🛑 END LIKE/UNLIKE LOGIC INTEGRATION 🛑
    // ====================================================================

    builder // CREATE EVENT
      .addCase(eventActions.createEvent.pending, (state) => {
        console.log("🔍 [DEBUG] createEvent.pending triggered");
        state.status = STATUS.LOADING;
        state.error = null;
      })
      .addCase(eventActions.createEvent.fulfilled, (state, action) => {
        console.log(
          "🔍 [DEBUG] createEvent.fulfilled triggered with payload:",
          action.payload
        );
        state.status = STATUS.SUCCEEDED;
        state.userEvents.unshift(action.payload.event);
        state.error = null;
      })
      .addCase(eventActions.createEvent.rejected, (state, action) => {
        console.log(
          "🔍 [DEBUG] createEvent.rejected triggered with error:",
          action.payload
        );
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to create event";
      }) // GET EVENT BY ID

      .addCase(eventActions.getEventById.pending, (state) => {
        console.log("🔍 [DEBUG] getEventById.pending triggered");
        state.status = STATUS.LOADING;
        state.error = null;
      })
      .addCase(eventActions.getEventById.fulfilled, (state, action) => {
        console.log(
          "🔍 [DEBUG] getEventById.fulfilled triggered with payload:",
          action.payload
        );
        state.status = STATUS.SUCCEEDED;
        state.currentEvent = action.payload; // Store for form pre-fill
        state.error = null;
      })
      .addCase(eventActions.getEventById.rejected, (state, action) => {
        console.log(
          "🔍 [DEBUG] getEventById.rejected triggered with error:",
          action.payload
        );
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to fetch event";
        state.currentEvent = null;
      }) // FETCH USER EVENTS

      .addCase(eventActions.fetchUserEvents.pending, (state) => {
        console.log("🔍 [DEBUG] fetchUserEvents.pending triggered");
        state.status = STATUS.LOADING;
        state.error = null;
      })
      .addCase(eventActions.fetchUserEvents.fulfilled, (state, action) => {
        console.log(
          "🔍 [DEBUG] fetchUserEvents.fulfilled triggered with payload:",
          action.payload
        );
        state.status = STATUS.SUCCEEDED;
        state.userEvents = action.payload || [];
        state.error = null;
      })
      .addCase(eventActions.fetchUserEvents.rejected, (state, action) => {
        console.log(
          "🔍 [DEBUG] fetchUserEvents.rejected triggered with error:",
          action.payload
        );
        state.status = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to fetch events";
      }) // FETCH EVENT ANALYTICS

      .addCase(eventActions.fetchEventAnalytics.pending, (state) => {
        console.log("🔍 [DEBUG] fetchEventAnalytics.pending triggered");
        state.analyticsStatus = STATUS.LOADING;
      })
      .addCase(eventActions.fetchEventAnalytics.fulfilled, (state, action) => {
        console.log(
          "🔍 [DEBUG] fetchEventAnalytics.fulfilled triggered with payload:",
          action.payload
        );
        state.analyticsStatus = STATUS.SUCCEEDED;
        state.analytics = action.payload.analytics;
      })
      .addCase(eventActions.fetchEventAnalytics.rejected, (state, action) => {
        console.log(
          "🔍 [DEBUG] fetchEventAnalytics.rejected triggered with error:",
          action.payload
        );
        state.analyticsStatus = STATUS.FAILED;
        state.error = action.payload?.message || "Failed to fetch analytics";
      }) // UPDATE EVENT

      .addCase(eventActions.updateEvent.fulfilled, (state, action) => {
        console.log(
          "🔍 [DEBUG] updateEvent.fulfilled triggered with payload:",
          action.payload
        );
        const updatedEvent = action.payload.event; // Update in userEvents array

        const index = state.userEvents.findIndex(
          (e) => e.id === updatedEvent.id
        );
        if (index !== -1) {
          state.userEvents[index] = updatedEvent;
        } // Update selectedEvent if it's the same event

        if (state.selectedEvent?.id === updatedEvent.id) {
          state.selectedEvent = updatedEvent;
        } // Update currentEvent if it's the same event

        if (state.currentEvent?.id === updatedEvent.id) {
          state.currentEvent = updatedEvent;
        }
      }) // DELETE EVENT

      .addCase(eventActions.deleteEvent.fulfilled, (state, action) => {
        console.log(
          "🔍 [DEBUG] deleteEvent.fulfilled triggered with payload:",
          action.payload
        );
        const deletedEventId = action.payload.eventId;
        state.userEvents = state.userEvents.filter(
          (e) => e.id !== deletedEventId
        ); // Clear selected/current if they match the deleted event

        if (state.selectedEvent?.id === deletedEventId) {
          state.selectedEvent = null;
          state.analytics = initialState.analytics;
        }
        if (state.currentEvent?.id === deletedEventId) {
          state.currentEvent = null;
        }
      }) // PUBLISH EVENT

      .addCase(eventActions.publishEvent.fulfilled, (state, action) => {
        console.log(
          "🔍 [DEBUG] publishEvent.fulfilled triggered with payload:",
          action.payload
        );
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

    console.log("🔍 [DEBUG] extraReducers build completed");
  },
});

export const {
  clearEventError,
  setSelectedEvent,
  clearSelectedEvent,
  clearCurrentEvent,
} = eventSlice.actions;

console.log("🔍 [DEBUG] eventSlice created successfully");
export default eventSlice.reducer;
