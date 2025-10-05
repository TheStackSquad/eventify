//frontend/src/components/common/toast/toastProvider.js

import React from "react";
import { ToastContainer } from "react-toastify";
// CRITICAL FIX: The CSS import has been removed from here because the
// bundler cannot handle it inside a component file.
// The user MUST add the following line to their global CSS file (e.g., globals.css):
// 

/**
 * @file frontend/src/components/common/toast/toastProvider.js
 * @description This component renders the ToastContainer, which acts as the
 * global portal where all notifications appear. It must be
 * placed in the RootLayout to be globally available.
 */
export default function ToastProvider() {
  return (
    <ToastContainer
      // Positioned in the top-right corner
      position="top-right"
      // Messages auto-close after 5 seconds
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      // Example of applying a theme
      theme="colored"
    />
  );
}
