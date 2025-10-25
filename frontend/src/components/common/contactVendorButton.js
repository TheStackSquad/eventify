//frontend/src/components/common/contactVendorButton.js

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Mail, Loader2, X } from "lucide-react";
// Import from ACTION file, not reducer
import { createInquiry } from "@/redux/action/inquiryAction";
// Import from REDUCER file (the slice actions)
import { resetCreateInquiryStatus } from "@/redux/action/inquiryAction";
import { STATUS } from "@/utils/constants/globalConstants";

// Helper component for the modal. All styling uses Tailwind CSS.
const InquiryModal = ({ vendorId, isOpen, onClose, dispatch }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  // Select state from the dedicated inquiry slice
  const createInquiryState = useSelector(
    (state) => state.inquiry.createInquiry
  );

  const isLoading = createInquiryState.status === STATUS.LOADING;
  const isSuccess = createInquiryState.status === STATUS.SUCCESS;
  const createInquiryError = createInquiryState.error;

  useEffect(() => {
    // Clear success state and close modal after a short delay
    if (isSuccess) {
      const timer = setTimeout(() => {
        dispatch(resetCreateInquiryStatus()); // Use the slice action
        onClose();
      }, 2000); // Close after 2 seconds
      return () => clearTimeout(timer);
    }
    // If the modal opens, reset form and status
    if (isOpen) {
      setFormData({ name: "", email: "", message: "" });
      dispatch(resetCreateInquiryStatusSlice()); // Use the slice action
    }
  }, [isSuccess, isOpen, onClose, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading || isSuccess) return;

    dispatch(
      createInquiry({
        vendorId,
        ...formData,
      })
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg transition-all transform scale-100 opacity-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Send Inquiry
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Message Area */}
          {isSuccess && (
            <div
              className="p-3 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200"
              role="alert"
            >
              Inquiry sent successfully! The vendor will contact you soon.
            </div>
          )}
          {createInquiryError && (
            <div
              className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200"
              role="alert"
            >
              Error: {createInquiryError}
            </div>
          )}

          {/* Form Fields */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Your Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Message/Details
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="4"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            ></textarea>
          </div>

          {/* Submission Button */}
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors ${
              isLoading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } ${
              isSuccess ? "bg-green-500 hover:bg-green-500 cursor-default" : ""
            }`}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSuccess ? "Sent!" : "Submit Inquiry"}
          </button>
        </form>
      </div>
    </div>
  );
};

const ContactVendorButton = ({ vendorId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();

  // Remove this line - you can't call dispatch directly in component body
  // dispatch(resetCreateInquiryStatus());

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out w-full sm:w-auto"
      >
        <Mail className="mr-2 h-5 w-5" />
        Contact Vendor
      </button>
      <InquiryModal
        vendorId={vendorId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dispatch={dispatch}
      />
    </>
  );
};

export default ContactVendorButton;
