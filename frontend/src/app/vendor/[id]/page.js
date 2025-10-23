// frontend/src/app/vendor/[id]/page.js
"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getVendorProfile } from "@/redux/action/vendorAction";
import { clearSelectedVendor } from "@/redux/reducer/vendorReducer";
import { parseSlugToId } from "@/utils/helper/vendorSlugHelper";

// Import the new selectors
import {
  selectVendorById,
  selectVendorsStatus,
  selectVendorsError,
  selectSelectedVendor,
} from "@/redux/selectors/vendorSelectors";

import { STATUS } from "@/utils/constants/globalConstants";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import VendorProfileDetail from "@/components/vendorUI/vendorProfileDetail";

// Define the Vendor Detail Page Component
const VendorProfilePage = ({ params }) => {
  const dispatch = useDispatch();

  // Use the new selectors to get data from normalized state
  const status = useSelector(selectVendorsStatus);
  const error = useSelector(selectVendorsError);
  const selectedVendorFromStore = useSelector(selectSelectedVendor);

  // Debug: Log the raw params
  console.log("🔍 Raw params:", params);

  // Extract slug from params (Next.js 14+ compatible)
  const slug = params?.id;
  console.log("🔍 Extracted slug:", slug);

  // Parse vendor ID from slug
  const vendorId = parseSlugToId(slug);
  console.log("🔍 Parsed vendor ID:", vendorId);

  // Get vendor data from normalized store (cache-first approach)
  const cachedVendor = useSelector((state) =>
    selectVendorById(state, vendorId)
  );
  const isDataFresh = useSelector((state) =>
    selectIsVendorDataFresh(state, vendorId)
  );

  console.log("🔍 Cache Check:", {
    vendorId,
    hasCachedData: !!cachedVendor,
    isDataFresh,
    cachedVendorName: cachedVendor?.name,
    selectedVendorName: selectedVendorFromStore?.name,
  });

  // Determine which vendor data to use (cache-first approach)
  const vendorToDisplay = selectedVendorFromStore || cachedVendor;

  // Determine loading state - only show loading if we have no data at all
  const hasNoData = !vendorToDisplay && !cachedVendor;
  const isLoading = status === STATUS.LOADING && hasNoData;
  const isBackgroundLoading = status === STATUS.LOADING && !!vendorToDisplay;

  // 2. Fetch the Vendor Data on Component Mount (cache-first approach)
  useEffect(() => {
    console.log("🚀 useEffect triggered with vendorId:", vendorId);
    console.log("📊 Pre-fetch State:", {
      vendorId,
      hasCachedData: !!cachedVendor,
      isDataFresh,
      shouldFetch: !cachedVendor || !isDataFresh,
    });

    if (vendorId) {
      // Only fetch if we don't have cached data or data is stale
      if (!cachedVendor || !isDataFresh) {
        console.log(
          "📡 Dispatching getVendorProfile (cache miss or stale):",
          vendorId
        );
        dispatch(getVendorProfile(vendorId))
          .unwrap()
          .then((result) => {
            console.log("✅ Vendor profile fetched successfully:", {
              vendorName: result?.name,
              source: cachedVendor ? "Background refresh" : "Initial fetch",
              wasCached: !!cachedVendor,
            });
          })
          .catch((err) => {
            console.error("❌ Failed to fetch vendor profile:", {
              error: err,
              message: err?.message,
              status: err?.status,
              hadCachedData: !!cachedVendor,
            });

            // If we have cached data but API failed, we can still use cached data
            if (cachedVendor) {
              console.log("🔄 Falling back to cached data:", cachedVendor.name);
            }
          });
      } else {
        console.log(
          "🎯 Using cached vendor data, no API call needed:",
          cachedVendor.name
        );
      }
    } else {
      console.error(
        "❌ Invalid vendor slug provided. Slug:",
        slug,
        "Parsed ID:",
        vendorId
      );
    }

    // Cleanup: Clear the selected vendor when leaving the page
    return () => {
      console.log("🧹 Cleaning up vendor profile page");
      dispatch(clearSelectedVendor());
    };
  }, [dispatch, vendorId, slug, cachedVendor, isDataFresh]);

  // Debug: Log current state
  console.log("📊 Current page state (Normalized):", {
    vendorId,
    isLoading,
    isBackgroundLoading,
    hasNoData,
    hasCachedData: !!cachedVendor,
    hasSelectedVendor: !!selectedVendorFromStore,
    vendorToDisplay: vendorToDisplay
      ? {
          name: vendorToDisplay.name,
          id: vendorToDisplay.id,
          source: vendorToDisplay === cachedVendor ? "CACHE" : "API",
        }
      : null,
    error,
    isDataFresh,
  });

  // 3. Render Logic (Loading, Error, or Success)

  if (!vendorId) {
    console.log("❌ Rendering invalid URL state");
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <h1 className="text-2xl text-red-600 font-bold mb-4">
            Invalid Vendor URL
          </h1>
          <p className="text-gray-600 mb-4">
            The vendor link appears to be broken or invalid.
          </p>
          <p className="text-sm text-gray-500">
            Slug received: &quot;{slug}&quot;
          </p>
        </div>
      </div>
    );
  }

  // Show loading spinner only if we have NO data at all
  if (isLoading) {
    console.log("⏳ Rendering loading state (no cached data)");
    return (
      <LoadingSpinner
        fullScreen={true}
        message="Loading Vendor Profile..."
        subMessage="Fetching details from the database."
      />
    );
  }

  // Show error state only if we have NO data and there's an error
  if (error && !vendorToDisplay) {
    console.log("❌ Rendering error state (no cached data):", { error });
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6 text-center">
        <div className="p-10 bg-white shadow-xl rounded-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Vendor Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {error?.message ||
              "The profile you are looking for does not exist or has been removed."}
          </p>
          <div className="text-sm text-gray-500 text-left bg-gray-50 p-3 rounded">
            <p>
              <strong>Vendor ID:</strong> {vendorId}
            </p>
            <p>
              <strong>Error Type:</strong> {error?.status || "Unknown"}
            </p>
            <p>
              <strong>Slug:</strong> {slug}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If we have cached data but API is loading in background, show cached data with loading indicator
  if (isBackgroundLoading && vendorToDisplay) {
    console.log(
      "🔄 Rendering cached data with background refresh:",
      vendorToDisplay.name
    );
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Background loading indicator */}
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Updating...</span>
          </div>
        </div>

        <main className="p-4 md:p-8">
          <VendorProfileDetail vendor={vendorToDisplay} isRefreshing={true} />
        </main>
      </div>
    );
  }

  // 4. Success: Display the detailed profile (with cached or fresh data)
  console.log("✅ Rendering vendor profile for:", vendorToDisplay.name, {
    source: vendorToDisplay === cachedVendor ? "CACHED" : "FRESH",
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <VendorProfileDetail vendor={vendorToDisplay} />
    </main>
  );
};

export default VendorProfilePage;
