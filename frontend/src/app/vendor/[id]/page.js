// frontend/src/app/vendor/[id]/page.js

"use client";

import React, { useEffect, useState } from "react";
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
import vendorStorage from "@/utils/helper/vendorStorage";

const VendorProfilePage = ({ params }) => {
  const dispatch = useDispatch();

  // Extract vendor ID from slug
  const slug = params?.id;
  const vendorId = parseSlugToId(slug);

  // Local state for vendor data
  const [vendor, setVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redux state (only used for manual retry)
  const selectedVendor = useSelector(selectSelectedVendor);
  const cachedVendor = useSelector((state) =>
    selectVendorById(state, vendorId)
  );
  const status = useSelector(selectProfileStatus);
  const error = useSelector(selectProfileError);

  // Load vendor data on mount - Priority: localStorage → Redux
  useEffect(() => {
    if (!vendorId) {
      setIsLoading(false);
      return;
    }

    console.log("🔍 Loading vendor data for ID:", vendorId);

    // Priority 1: Check localStorage first
    const cachedVendorData = vendorStorage.getVendor(vendorId);

    if (cachedVendorData) {
      console.log("✅ Vendor loaded from localStorage");
      setVendor(cachedVendorData);
      setIsLoading(false);
      return;
    }

    // Priority 2: Check Redux store
    const reduxVendor = selectedVendor || cachedVendor;

    if (reduxVendor) {
      console.log("✅ Vendor loaded from Redux");
      setVendor(reduxVendor);
      setIsLoading(false);
      // Also save to localStorage for future refreshes
      vendorStorage.saveVendor(reduxVendor);
      return;
    }

    // No data found anywhere
    console.log("❌ No vendor data found in cache");
    setIsLoading(false);
  }, [vendorId, selectedVendor, cachedVendor]);

  // Sync Redux changes to local state (for manual retry)
  useEffect(() => {
    if (selectedVendor && selectedVendor.id === vendorId) {
      console.log("🔄 Syncing Redux vendor to local state");
      setVendor(selectedVendor);
      // Save to localStorage
      vendorStorage.saveVendor(selectedVendor);
    }
  }, [selectedVendor, vendorId]);

  // Show error toast when manual fetch fails
  useEffect(() => {
    if (status === STATUS.FAILED && error) {
      toastAlert.error(error.message || "Failed to load vendor profile");
    }
  }, [status, error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear localStorage for this vendor
      if (vendorId) {
        vendorStorage.clearVendor(vendorId);
        console.log("🗑️ Cleared vendor cache on unmount");
      }

      // Clear Redux state
      dispatch(clearSelectedVendor());
      dispatch(clearProfileError());
    };
  }, [vendorId, dispatch]);

  // Handler for manual retry (only way to fetch from server)
  const handleRetry = () => {
    console.log("🔄 Manual retry - fetching from server...");
    toastAlert.info("Reloading profile...");
    dispatch(clearProfileError());
    dispatch(getVendorProfile(vendorId));
  };

  const handleRatingSubmit = (rating, reviewText) => {
    // dispatch(submitRating({ vendorId, rating, review: reviewText }));
  };

  // Loading state (only shows briefly on initial mount)
  if (isLoading) {
    return (
      <LoadingSpinner
        fullScreen
        message="Loading vendor profile..."
        subMessage="Retrieving details..."
      />
    );
  }

  // Invalid URL
  if (!vendorId) {
    return <InvalidVendorUrl slug={slug} />;
  }

  // No data found - show error with retry option
  if (!vendor) {
    return (
      <ErrorState
        error={
          error || {
            message: "Vendor data not found. Please try loading from server.",
          }
        }
        vendorId={vendorId}
        slug={slug}
        isLoading={status === STATUS.LOADING}
        onRetry={handleRetry}
      />
    );
  }

  // Success - render vendor profile
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <main className="max-w-7xl mx-auto py-8 px-4 md:py-12 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <VendorProfileDetail vendor={vendor} />
          </div>

          <aside className="lg:col-span-1 space-y-6">
            <div className="sticky top-20 space-y-6">
              {/* Only render if vendor exists */}
              {vendor && (
                <>
                  <ContactCard vendor={vendor} vendorId={vendorId} />
                  <RatingCard
                    vendor={vendor}
                    vendorId={vendorId}
                    onSubmit={handleRatingSubmit}
                  />
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

// Extracted Components for Better Maintainability
const InvalidVendorUrl = ({ slug }) => (
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
          <span className="font-semibold text-gray-800">Slug:</span> "
          {slug || "none"}"
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

const ErrorState = ({ error, vendorId, slug, isLoading, onRetry }) => {
  const isNotFound = error?.status === "NOT_FOUND";

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
            {isNotFound ? "Vendor Not Found" : "Profile Unavailable"}
          </h1>
          <p className="text-gray-600 text-lg mb-2">
            {error?.message ||
              "We couldn't load this vendor profile. Please try again."}
          </p>
          <p className="text-sm text-gray-500">
            Click "Load from Server" to fetch the latest data.
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-6 mb-8 space-y-3 border border-gray-200">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="font-semibold text-gray-700">Vendor ID:</span>
            <span className="text-gray-900 font-mono text-sm">{vendorId}</span>
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
            onClick={onRetry}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Load from Server"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ContactCard = ({ vendor, vendorId }) => (
  <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Ready to Book?</h3>
    <p className="text-gray-600 mb-6">
      Connect with <strong>{vendor.name}</strong> to discuss your event.
    </p>
    <ContactVendorButton vendorId={vendorId} vendorName={vendor.name} />
  </div>
);

const RatingCard = ({ vendor, vendorId, onSubmit }) => (
  <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Rate This Vendor</h3>
    <p className="text-gray-600 mb-4">
      Share your experience with {vendor.name}
    </p>
    <RateVendor
      vendorId={vendorId}
      vendorName={vendor.name}
      onSubmit={onSubmit}
    />
  </div>
);

export default VendorProfilePage;
