// frontend/src/components/vendorUI/VendorListingView.js

"use client";

import React from "react";
import { Search, SlidersHorizontal, BarChart4 } from "lucide-react";

// The Vendor Listing View is now a clean presentation component.
// It relies on props from the container (VendorListingPage) for state.

/**
 * VendorListingView
 * Renders the main vendor search and results layout.
 * It is a presentation component, receiving data, loading state, and handlers via props.
 * * @param {Array} vendors - List of vendor objects to display.
 * @param {boolean} isLoading - True if data is currently being fetched.
 * @param {boolean} isError - True if a fetching error occurred.
 * @param {Object} filters - Current filter state.
 * @param {function} onRegisterClick - Handler to switch to the registration view.
 * @param {function} onFilterChange - Handler for when filters are updated.
 */
const VendorListingView = ({
  vendors,
  isLoading,
  isError,
  filters,
  onRegisterClick,
  onFilterChange,
}) => {
  const vendorCount = vendors.length;

  // Render Loading State
  if (isLoading && vendorCount === 0) {
    // Note: The container handles full-screen loading, but this handles local loading animation if needed.
    return (
      <div className="flex justify-center items-center py-20 bg-white shadow-lg rounded-xl">
        <svg
          className="animate-spin h-8 w-8 text-indigo-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="ml-3 text-lg text-gray-700">Loading vendors...</p>
      </div>
    );
  }

  // Render Error State
  if (isError) {
    return (
      <div className="text-center px-12 mx-5 mt-12 h-[400px] lg:h-[300px] py-7 bg-red-50 border-2 border-red-300 rounded-xl shadow-lg">
        <p className="text-2xl font-bold text-red-700 mb-4">
          Connection Failed
        </p>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t retrieve the list of vendors. Please check your network or
          try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-150"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Render No Results State
  const hasVendors = vendorCount > 0;
  if (!hasVendors) {
    return (
      <div className="text-center p-16 bg-white rounded-xl shadow-lg">
        <BarChart4 className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <p className="text-2xl font-semibold text-gray-800 mb-3">
          No Vendors Found
        </p>
        <p className="text-gray-600 mb-6">
          Your search criteria returned no results. Try adjusting your filters
          or be the first to
          <button
            onClick={onRegisterClick}
            className="text-indigo-600 hover:text-indigo-800 font-medium ml-1 underline"
          >
            register your business!
          </button>
        </p>
      </div>
    );
  }

  // Main Content Rendering
  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
          {/* Search Input */}
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vendor name or category..."
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filters and CTA */}
          <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
            {/* Filter Button */}
            <button
              onClick={() => {
                /* Placeholder for filter logic */
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition duration-150"
              aria-label="Open filter options"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Registration CTA (Moved from VendorCTA) */}
            <button
              onClick={onRegisterClick}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Register Your Business
            </button>
          </div>
        </div>

        {/* Results Count and Grid */}
        <div className="pt-4 space-y-6">
          {/* Results Count */}
          <p className="text-xl font-medium text-gray-800">
            Showing{" "}
            <span className="font-bold text-indigo-600">{vendorCount}</span>{" "}
            Vendors matching your criteria.
          </p>

          {/* Vendor Grid (Simplified placeholder for the actual list) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vendors.map((vendor) => (
              <div
                key={vendor._id.$oid}
                className="bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 border border-gray-100 cursor-pointer flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-3">
                  {/* Placeholder image/icon for the vendor */}
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {vendor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {vendor.name}
                    </h3>
                    <p className="text-sm font-medium text-indigo-600">
                      {vendor.category}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {vendor.city} | Min Price:{" "}
                  <span className="font-semibold text-gray-700">
                    ${(vendor.min_price / 1000).toFixed(0)}k+
                  </span>
                </p>
                <div className="mt-2 text-xs font-medium text-gray-500 space-y-1">
                  <p
                    className={
                      vendor.is_identity_verified
                        ? "text-green-600"
                        : "text-red-500"
                    }
                  >
                    {vendor.is_identity_verified
                      ? "✅ Identity Verified"
                      : "❌ Identity Not Verified"}
                  </p>
                  <p>
                    Profile Completion:{" "}
                    <span className="text-indigo-600">
                      {vendor.profile_completion}%
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default VendorListingView;
