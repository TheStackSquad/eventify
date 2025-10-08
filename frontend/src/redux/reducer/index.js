// frontend/src/redux/reducer/index.js

import { combineReducers } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";

// ======================================================================
// 1. Conditional Storage for Next.js (SSR/Client)
// We must conditionally import storage to prevent Next.js from
// throwing errors when trying to access localStorage on the server side.
// ======================================================================
const storage =
  typeof window !== "undefined"
    ? require("redux-persist/lib/storage").default // Browser: uses localStorage
    : {
        // Server: no-op storage to fulfill the Promise API without localStorage access
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      };

// ======================================================================
// 2. Import Application Reducers
// ======================================================================
import authReducer from "./authReducers";
import eventReducer from "./eventReducer"; // Imported based on your initial store.js structure
import ticketReducer from "./ticketReducer"; // Imported based on your initial store.js structure

// ======================================================================
// 3. Redux-Persist Configuration
// ======================================================================
const persistConfig = {
  key: "root", // Key for the storage entry
  storage, // <-- Using the conditional storage
  // Specify which slices of the state to save/load from storage
  whitelist: ["auth"],
  // If you had a slice you explicitly did NOT want to persist, you'd use:
  // blacklist: ["events", "tickets"],
};

// ======================================================================
// 4. Combine Reducers
// ======================================================================
const combinedReducer = combineReducers({
  auth: authReducer,
  events: eventReducer, // Included eventReducer
  tickets: ticketReducer, // Included ticketReducer
});

// ======================================================================
// 5. Wrap the combined reducer with persistReducer
// This creates the final, ready-to-use persisted root reducer
// ======================================================================
const persistedReducer = persistReducer(persistConfig, combinedReducer);

export default persistedReducer;
