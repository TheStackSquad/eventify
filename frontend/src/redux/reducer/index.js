// frontend/src/redux/reducer/index.js

import { combineReducers } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";

// We need to use conditional imports for storage to prevent Next.js from
// throwing errors when trying to access localStorage on the server side.

/**
 * step 1: Define conditional storage.
 * On the browser (window is defined), we use localStorage (default import).
 * On the server (window is undefined), we use a 'no-op' storage object that
 * fulfills the Promise API but does nothing, preventing the error.
 */
const storage =
  typeof window !== "undefined"
    ? require("redux-persist/lib/storage").default // Browser: uses localStorage
    : {
        // Server: no-op storage to suppress the warning/error
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      };

// Import your application reducers
import authReducer from "@/redux/reducer/authReducers";

// step 2: Configuration for redux-persist, using the conditional storage
const persistConfig = {
  key: "root", // Key for storage entry
  storage, // <-- Using the conditional storage here
  // Add reducer slices you want to persist here
  whitelist: ["auth"],
};

// step 3: Combine application reducers
const combinedReducer = combineReducers({
  auth: authReducer,
  // Add other reducers here...
});

// step 4: Wrap the combined reducer with persistReducer
const persistedReducer = persistReducer(persistConfig, combinedReducer);

export default persistedReducer;
