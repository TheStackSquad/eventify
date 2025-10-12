// frontend/src/components/modal/delete.js

import React from "react";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

// Import Redux Action
import { deleteEvent } from "@/redux/action/eventAction"; // Assuming path is correct

export default function DeleteModal({ isOpen, onClose, eventId, eventTitle }) {
  const dispatch = useDispatch();

  if (!isOpen) return null;

  const handleDeleteConfirm = () => {
    if (eventId) {
      // Dispatch the deleteEvent thunk with the event ID
      dispatch(deleteEvent(eventId));
      // Close the modal immediately after dispatching
      onClose();
    }
  };

  // Simple modal backdrop and content animation
  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  const modalVariants = {
    visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.3 } },
    hidden: { y: "100vh", opacity: 0, scale: 0.8 },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      onClick={onClose} // Close on backdrop click
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
            <h3 className="text-xl font-bold text-gray-900">
              Confirm Deletion
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-gray-700 mb-6">
          <p className="mb-4">
            Are you sure you want to ***cancel*** this event?
            <br />
            <strong className="text-red-600 text-lg">
              &quot;{eventTitle}&quot;
            </strong>
          </p>
          <p className="text-sm text-gray-500">
            This event will be removed from public view and your dashboard.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-md"
          >
            Yes, Soft Delete Event
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
