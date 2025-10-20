// // frontend/src/redux/reducer/likeReducer.js
// import { createSlice } from "@reduxjs/toolkit";
// // Import the actions from the likes file
// import { toggleLikeOptimistic, toggleEventLike } from "@/redux/action/likeAction";

// // Assuming your initial state looks something like this:
// const initialState = {
//   userEvents: [], // Array of event objects
//   status: "idle",
//   error: null,
// };

// const eventSlice = createSlice({
//   name: "events",
//   initialState,
//   reducers: {
//     // Other existing reducers (e.g., setEvents, deleteEvent, etc.)
//     // ...
//   },
//   extraReducers: (builder) => {
//     // Handle other async actions for event fetching, etc.
//     // ...

//     // --- LIKE LOGIC ---

//     // 1. Optimistic Update: Immediate UI change
//     builder.addCase(toggleLikeOptimistic, (state, action) => {
//       const eventId = action.payload;
//       const event = state.userEvents.find((e) => e.id === eventId);
//       if (event) {
//         // Toggle the favorite status
//         const isLiking = !event.isLikedByUser;

//         event.isLikedByUser = isLiking;
//         event.likeCount = event.likeCount + (isLiking ? 1 : -1);
//       }
//     });

//     // 2. Server Confirmation (Success): Override optimistic value with server's final data
//     builder.addCase(toggleEventLike.fulfilled, (state, action) => {
//       const { eventId, newLikeCount, isLiked } = action.payload;
//       const event = state.userEvents.find((e) => e.id === eventId);
//       if (event) {
//         event.likeCount = newLikeCount;
//         event.isLikedByUser = isLiked;
//         // Note: The UI barely changes here unless there was a discrepancy.
//       }
//     });

//     // 3. Server Confirmation (Failure/Rollback): Revert the optimistic change
//     builder.addCase(toggleEventLike.rejected, (state, action) => {
//       // Get the data returned by rejectWithValue
//       const { eventId } = action.payload;
//       const event = state.userEvents.find((e) => e.id === eventId);
//       if (event) {
//         // Rollback the optimistic change by flipping the state back
//         const wasLiking = event.isLikedByUser;

//         event.isLikedByUser = !wasLiking;
//         event.likeCount = event.likeCount + (wasLiking ? -1 : 1);

//         // You might also set an error message here:
//         // state.error = "Could not update like status. Please try again.";
//       }
//     });
//   },
// });

// export default eventSlice.reducer;
