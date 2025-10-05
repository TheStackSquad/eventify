//frontend/src/redux/reducer/index.js

import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/redux/reducer/authReducers";
import storage from "redux-persist/lib/storage"; // Defaults to localStorage
import { persistReducer } from "redux-persist";

/**
 * @file frontend/src/redux/index.js
 * @description Combines all application reducers and configures persistence.
 */

// Configuration for redux-persist
const persistConfig = {
  key: "root", // Key for localStorage entry
  storage,
  // Add reducer slices you want to persist here
  whitelist: ["auth"],
};

// Combine non-persisted reducers here first if you had any
const combinedReducer = combineReducers({
  auth: authReducer,
  // ui: uiReducer, // Example of another reducer
});

// Wrap the combined reducer with persistReducer
const persistedReducer = persistReducer(persistConfig, combinedReducer);

export default persistedReducer;
