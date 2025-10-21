// frontend/src/app/vendor/page.js

"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchVendors } from "@/redux/action/vendorAction";
import { setVendorFilters } from "@/redux/reducer/vendorReducer";

import { STATUS } from "@/utils/constants/globalConstants";

import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import VendorListingView from "@/components/vendorUI/vendorListingView";

const VendorListingPage = () => {
  const dispatch = useDispatch();
  const { vendors, status, error, filters } = useSelector(
    (state) => state.vendors
  );

  console.log("🔍 Vendor State Check:", {
    vendorsCount: vendors?.length,
    status,
    error,
    filters,
  });

  const isLoading = status === STATUS.LOADING;

  // Fetch vendors on initial load and whenever filters change
  useEffect(() => {
    console.log(
      "🚀 useEffect triggered - Fetching vendors with filters:",
      filters
    );

    // Add a small delay to ensure component is properly mounted
    const timer = setTimeout(() => {
      dispatch(fetchVendors(filters))
        .unwrap()
        .then((result) => {
          console.log(
            "✅ Vendors fetched successfully:",
            result?.length || 0,
            "vendors"
          );
        })
        .catch((err) => {
          console.error("❌ Failed to fetch vendors:", err);
        });
    }, 100);

    return () => clearTimeout(timer);
  }, [dispatch, filters]);

  const handleFilterChange = (newFilters) => {
    console.log("🔄 Filter change:", newFilters);
    dispatch(setVendorFilters(newFilters));
  };

  // Enhanced loading state with more context
  if (isLoading && (!vendors || vendors.length === 0)) {
    return (
      <LoadingSpinner
        fullScreen={true}
        message="Searching for top-rated vendors..."
        subMessage="This may take a moment to load all services."
      />
    );
  }

  // Error state
  if (error && (!vendors || vendors.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Failed to Load Vendors
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchVendors(filters))}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main listing view
  return (
    <VendorListingView
      vendors={vendors || []}
      filters={filters}
      onFilterChange={handleFilterChange}
      isLoading={isLoading}
      isError={!!error}
    />
  );
};

export default VendorListingPage;
