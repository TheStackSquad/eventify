//frontend/src/components/vendorUI/VendorRegistrationView.jsx

import React from "react";
import VendorForm from "@/components/vendorUI/vendorForm";

const VendorRegistrationView = ({ onBack, onSubmissionSuccess }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Vendor Listings
        </button>

        {/* Form Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Register Your Business
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Join Nigeria&apos;s leading event services marketplace and connect
            with thousands of potential clients.
          </p>
        </div>

        {/* Form Container */}
        <VendorForm onSubmissionSuccess={onSubmissionSuccess} />
      </div>
    </div>
  );
};

export default VendorRegistrationView;
