// src/axiosConfig/axios.js

import axios from "axios";

const instance = axios.create({
  // Use a relative path, Next.js will automatically proxy to the current domain
  baseURL: "/",
  timeout: 10000, // Timeout requests after 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
  // Setting withCredentials to true is essential for sending and receiving HttpOnly cookies
  withCredentials: true,
});


export default instance;
