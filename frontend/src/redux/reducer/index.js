// frontend/src/redux/reducer/index.js

import { combineReducers } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";

const storage =
  typeof window !== "undefined"
    ? require("redux-persist/lib/storage").default // Browser: uses localStorage
    : {
        // Server: no-op storage to fulfill the Promise API
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      };

import authReducer from "./authReducers";
import eventReducer from "./eventReducer";
import ticketReducer from "./ticketReducer";
import vendorReducer from "./vendorReducer"; // <-- NEW: Import Vendor Reducer

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"],
};

const combinedReducer = combineReducers({
  auth: authReducer,
  events: eventReducer,
  tickets: ticketReducer,
  vendors: vendorReducer,
});

const persistedReducer = persistReducer(persistConfig, combinedReducer);

export default persistedReducer;