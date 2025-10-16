// frontend/src/components/dashboard/VendorsDashboard.js
"use client";

import React, { useEffect, useState } from "react";
// NOTE: External imports (Redux) and aliased paths are assumed to be resolved by your environment.
import { useDispatch, useSelector } from "react-redux";
import { fetchVendors } from "@/redux/action/vendorAction";
import { setVendorFilters } from "@/redux/reducer/vendorReducer";
import { STATUS } from "@/utils/constants/globalConstants";

// FIX: Corrected relative paths based on the component's location in /components/dashboard/
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import VendorListingView from "@/components/vendorUI/vendorListingView";
import VendorRegistrationView from "@/components/vendorUI/vendorRegistrationView";

export default function VendorsDashboard() {
  const dispatch = useDispatch();
  const { vendors, status, error, filters } = useSelector(
    (state) => state.vendors
  );

  // State to toggle between the listing view and the registration form
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const isLoading = status === STATUS.LOADING;

  // Effect to fetch vendors when filters change or when switching back to listing view
  useEffect(() => {
    // Only fetch data if we are in the listing view
    if (!showRegistrationForm) {
      dispatch(fetchVendors(filters));
    }
  }, [dispatch, filters, showRegistrationForm]);

  const handleFilterChange = (newFilters) => {
    dispatch(setVendorFilters(newFilters));
  };

  // Logic to navigate to the Registration form/Profile Management
  const navigateToRegistration = () => setShowRegistrationForm(true);

  // Logic to navigate back to the Listing view and refresh data
  const navigateToListing = () => {
    // 1. Fetch the updated vendor list immediately.
    dispatch(fetchVendors(filters));

    // 2. Switch the view back to the listing page.
    setShowRegistrationForm(false);
  };

  // --- RENDERING SWITCH LOGIC ---

  // Loading state (only for listing view when no data is present)
  if (!showRegistrationForm && isLoading && vendors.length === 0) {
    return (
      <LoadingSpinner
        fullScreen={true}
        message="Searching for top-rated vendors..."
        subMessage="This may take a moment to load all services."
      />
    );
  }

  // Registration view
  if (showRegistrationForm) {
    return (
      <VendorRegistrationView
        onBack={navigateToListing}
        onSubmissionSuccess={navigateToListing}
      />
    );
  }

  // Main listing view
  return (
    <VendorListingView
      vendors={vendors}
      filters={filters}
      onRegisterClick={navigateToRegistration}
      onFilterChange={handleFilterChange}
    />
  );
}
