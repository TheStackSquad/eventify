// frontend/src/app/vendor/[id]/page.js

"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  clearSelectedVendor,
  clearProfileError,
} from "@/redux/reducer/vendorReducer";
import { getVendorProfile } from "@/redux/action/vendorAction";
import { parseSlugToId } from "@/utils/helper/vendorSlugHelper";
import { STATUS } from "@/utils/constants/globalConstants";
import {
  selectVendorById,
  selectSelectedVendor,
  selectProfileStatus,
  selectProfileError,
} from "@/redux/selectors/vendorSelectors";
import ContactVendorButton from "@/components/common/contactVendorButton";
import RateVendor from "@/components/common/rateVendor";
import VendorProfileDetail from "@/components/vendorUI/vendorProfileDetail";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import toastAlert from "@/components/common/toast/toastAlert";

const VendorProfilePage = ({ params }) => {
  const dispatch = useDispatch();
  const hasFetchedRef = useRef(false);
  const vendorIdRef = useRef(null);

  // --- URL PARAMETER & ID ---
  const unwrappedParams = React.use(params);
  const slug = unwrappedParams?.id;
  const vendorId = parseSlugToId(slug);

  // --- REDUX STATE SELECTION ---
  const selectedVendorFromStore = useSelector(selectSelectedVendor);
  const cachedVendor = useSelector((state) =>
    selectVendorById(state, vendorId)
  );
  const profileStatus = useSelector(selectProfileStatus);
  const profileError = useSelector(selectProfileError);

  // Priority: selectedVendor > cachedVendor
  const vendorToDisplay = selectedVendorFromStore || cachedVendor;

  // --- MEMOIZED FETCH FUNCTION ---
  const fetchVendorProfile = useCallback(() => {
    if (!vendorId) {
      return;
    }

    // Prevent duplicate fetches for the same vendor
    if (hasFetchedRef.current && vendorIdRef.current === vendorId) {
      return;
    }

    // SINGLE CONDITION: Fetch if we don't have data OR if we have a failed status
    const needsFetch =
      !vendorToDisplay ||
      profileStatus === STATUS.IDLE ||
      profileStatus === STATUS.FAILED;

    if (needsFetch) {
      hasFetchedRef.current = true;
      vendorIdRef.current = vendorId;
      dispatch(getVendorProfile(vendorId));
    }
  }, [vendorId, vendorToDisplay, profileStatus, dispatch]);

  // --- CORE FETCH LOGIC ---
  useEffect(() => {
    if (vendorIdRef.current !== vendorId) {
      hasFetchedRef.current = false;
      vendorIdRef.current = vendorId;
    }

    fetchVendorProfile();

    // Cleanup
    return () => {
      hasFetchedRef.current = false;
      vendorIdRef.current = null;
      dispatch(clearSelectedVendor());
      dispatch(clearProfileError());
    };
  }, [vendorId, fetchVendorProfile, dispatch]);

  // --- TOAST ALERT STATUS LISTENER ---
  useEffect(() => {
    // Only trigger for the current, relevant vendor ID
    if (vendorIdRef.current !== vendorId) {
      return;
    }

    // Display error toast on fetch failure
    if (profileStatus === STATUS.FAILED && profileError) {
      toastAlert.error(
        profileError.message ||
          "An unknown error occurred while loading the profile."
      );
    }
  }, [profileStatus, profileError, vendorId]);

  // --- MANUAL RETRY HANDLER ---
  const handleRetryFetch = useCallback(() => {
    // Provide immediate feedback to the user
    toastAlert.info("Attempting to reload profile...");

    // Reset the fetch guard
    hasFetchedRef.current = false;
    vendorIdRef.current = null;
    // Clear error state to allow the next fetch to happen cleanly
    dispatch(clearProfileError());
    // Trigger new fetch
    dispatch(getVendorProfile(vendorId));
    // Set guard again
    hasFetchedRef.current = true;
    vendorIdRef.current = vendorId;
  }, [dispatch, vendorId]);

  // --- RATING HANDLER ---
  const handleRatingSubmit = useCallback(
    (rating, reviewText) => {
      // Logic for submitting rating
      // dispatch(submitRating({ vendorId, rating, review: reviewText }));
    },
    [vendorId]
  );

  // --- RENDER LOGIC ---
  const isLoading = profileStatus === STATUS.LOADING;
  const hasError = profileStatus === STATUS.FAILED;

  // 1. LOADING STATE
  if (isLoading && !vendorToDisplay) {
    return (
      <LoadingSpinner
        fullScreen={true}
        message="Loading vendor profile..."
        subMessage="Retrieving latest details."
      />
    );
  }

  // 2. INVALID URL STATE
  if (!vendorId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
            Invalid Vendor URL
          </h1>
          <p className="text-gray-600 mb-6">
            The vendor link appears to be broken. Please check the URL.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-200">
            <p className="text-sm text-gray-600 font-mono break-all">
              <span className="font-semibold text-gray-800">Slug:</span> &quot;
              {slug || "none"}&quot;
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // 3. ERROR STATE (NO DATA AVAILABLE)
  if (hasError && !vendorToDisplay) {
    const isNotFoundError = profileError?.status === "NOT_FOUND";
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              {isNotFoundError ? "Vendor Not Found" : "Profile Unavailable"}
            </h1>
            <p className="text-gray-600 text-lg">
              {profileError?.message ||
                "We couldn't load this vendor profile. Please try again."}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 mb-8 space-y-3 border border-gray-200">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-700">Vendor ID:</span>
              <span className="text-gray-900 font-mono text-sm">
                {vendorId}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-gray-700">Slug:</span>
              <span className="text-gray-900 font-mono text-xs break-all">
                {slug}
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Go Back
            </button>
            <button
              onClick={handleRetryFetch}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
            >
              {isLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. SUCCESS STATE - Display vendor
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <main className="max-w-7xl mx-auto py-8 px-4 md:py-12 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <VendorProfileDetail vendor={vendorToDisplay} />
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="sticky top-20 space-y-6">
              {/* Contact Card */}
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Ready to Book?
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect with <strong>{vendorToDisplay.name}</strong> to
                  discuss your event.
                </p>
                <ContactVendorButton
                  vendorId={vendorId}
                  vendorName={vendorToDisplay.name}
                />
              </div>

              {/* Rating Component */}
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Rate This Vendor
                </h3>
                <p className="text-gray-600 mb-4">
                  Share your experience with {vendorToDisplay.name}
                </p>
                <RateVendor
                  vendorId={vendorId}
                  vendorName={vendorToDisplay.name}
                  onSubmit={handleRatingSubmit}
                />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default VendorProfilePage;
