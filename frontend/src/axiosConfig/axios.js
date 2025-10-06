// src/axiosConfig/axios.js

import axios from "axios";

// 1. Define the base URL using an environment variable
// Use a fallback for safety, e.g., the local Go server address
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

console.log("Axios Base URL set to:", API_BASE_URL); // Useful for tracing configuration errors

const instance = axios.create({
  // Use the environment variable for the base URL
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default instance;
