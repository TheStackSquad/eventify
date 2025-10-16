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

  // --- REMOVED: showRegistrationForm state (no longer needed here)
  const isLoading = status === STATUS.LOADING;

  // Fetch vendors on initial load and whenever filters change
  useEffect(() => {
    // --- SIMPLIFIED: Removed !showRegistrationForm condition
    dispatch(fetchVendors(filters));
  }, [dispatch, filters]);

  const handleFilterChange = (newFilters) => {
    dispatch(setVendorFilters(newFilters));
  };

  // --- REMOVED: navigateToRegistration and navigateToListing functions

  // Loading state (Full screen only when initially loading with no data)
  if (isLoading && vendors.length === 0) {
    // --- SIMPLIFIED: Removed !showRegistrationForm condition
    return (
      <LoadingSpinner
        fullScreen={true}
        message="Searching for top-rated vendors..."
        subMessage="This may take a moment to load all services."
      />
    );
  }

  // --- REMOVED: Registration view conditional rendering block

  // Main listing view (handles its own local loading/error display once data is present/failed)
  return (
    <VendorListingView
      vendors={vendors}
      filters={filters}
      // --- REMOVED: onRegisterClick prop (registration is now handled via the sidebar/router)
      onFilterChange={handleFilterChange}
      isLoading={isLoading}
      isError={!!error}
    />
  );
};

export default VendorListingPage;
