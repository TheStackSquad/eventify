// frontend/src/components/common/toast/toastAlert.js

import { toast } from "react-toastify";

/**
 * @file frontend/src/components/common/toast/toastAlert.js
 * @description Utility wrapper for react-toastify calls. This is imported
 * and used inside the Redux Thunks (authAction.js) to trigger
 * notifications after API success or failure.
 */
export const toastAlert = {
  /**
   * Displays a success notification.
   * @param {string} message - The message to display.
   */
  success: (message) => {
    toast.success(message, {
      // You can add global success options here
      // For instance: position: "bottom-left"
    });
  },

  /**
   * Displays an error notification.
   * @param {string} message - The message to display.
   */
  error: (message) => {
    toast.error(message, {
      // You can add global error options here
    });
  },

  /**
   * Displays a warning notification.
   * @param {string} message - The message to display.
   */
  warn: (message) => {
    toast.warn(message, {});
  },

  /**
   * Displays a general info notification.
   * @param {string} message - The message to display.
   */
  info: (message) => {
    toast.info(message, {});
  },
};
