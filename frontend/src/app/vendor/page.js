
// frontend/src/app/vendor/page.js
"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVendors } from "@/redux/action/vendorAction";
import { setVendorFilters } from "@/redux/reducer/vendorReducer";
import { STATUS } from "@/utils/constants/globalConstants";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import VendorListingView from "@/components/vendorUI/vendorListingView";
import VendorRegistrationView from "@/components/vendorUI/vendorRegistrationView";
import ErrorState from "@/components/vendorUI/errorState";


const VendorListingPage = () => {
  const dispatch = useDispatch();
  const { vendors, status, error, filters } = useSelector(
    (state) => state.vendors
  );
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const isLoading = status === STATUS.LOADING;

  useEffect(() => {
    if (!showRegistrationForm) {
      dispatch(fetchVendors(filters));
    }
  }, [dispatch, filters, showRegistrationForm]);

  const handleFilterChange = (newFilters) => {
    dispatch(setVendorFilters(newFilters));
  };

  const navigateToRegistration = () => setShowRegistrationForm(true);
  const navigateToListing = () => {
    // 1. Fetch the updated vendor list immediately.
    // This ensures the new vendor (or updated profile) is visible.
    dispatch(fetchVendors(filters));

    // 2. Switch the view back to the listing page.
    // This relies on your existing Redux Thunk logic:
    // - In useVendorFormHandler.js, onSubmissionSuccess is only called
    //   AFTER the API returns 200/201 (success).
    // - Switching the view will now briefly show a loading state
    //   while the new fetchVendors call is pending.
    setShowRegistrationForm(false);
  };


  // Loading state
  if (!showRegistrationForm && isLoading && vendors.length === 0) {
    return (
      <LoadingSpinner
        fullScreen={true}
        message="Searching for top-rated vendors..."
        subMessage="This may take a moment to load all services."
      />
    );
  }

  // Error state
  if (!showRegistrationForm && error) {
    return (
      <ErrorState
        error={error}
        onBack={navigateToListing}
        onRegister={navigateToRegistration}
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
};

export default VendorListingPage;