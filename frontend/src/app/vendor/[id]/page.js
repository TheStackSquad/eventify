// frontend/src/app/vendor/[id]/page.js


"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearSelectedVendor } from "@/redux/reducer/vendorReducer";
import { parseSlugToId } from "@/utils/helper/vendorSlugHelper";

import {
  selectVendorById,
  selectSelectedVendor,
} from "@/redux/selectors/vendorSelectors";

// Import the components
import ContactVendorButton from "@/components/common/contactVendorButton";
import RateVendor from "@/components/common/rateVendor";
import VendorProfileDetail from "@/components/vendorUI/vendorProfileDetail";

// Import inquiry actions (assuming you'll handle both contact and rating here)
// import { submitInquiry, submitRating } from "@/redux/action/inquiryAction";

const VendorProfilePage = ({ params }) => {
  const dispatch = useDispatch();

  // Keep selectedVendorFromStore for potential direct navigation/selection
  const selectedVendorFromStore = useSelector(selectSelectedVendor);

  // FIX: Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const slug = unwrappedParams?.id;
  const vendorId = parseSlugToId(slug);

  // Get vendor data from store (cache-first approach) - This is the primary source now
  const cachedVendor = useSelector((state) =>
    selectVendorById(state, vendorId)
  );

  console.log("🔍 Page State:", {
    vendorId,
    slug,
    hasCachedData: !!cachedVendor,
    hasSelectedVendor: !!selectedVendorFromStore,
    cachedVendorName: cachedVendor?.name,
    selectedVendorName: selectedVendorFromStore?.name,
  });

  const vendorToDisplay = selectedVendorFromStore || cachedVendor;

  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up vendor profile page");
      dispatch(clearSelectedVendor());
    };
  }, [dispatch]);

  // Handle rating submission
  const handleRatingSubmit = (rating, reviewText) => {
    console.log("Submitting rating for vendor:", vendorId, rating, reviewText);
    // Dispatch your rating action here
    // dispatch(submitRating({ vendorId, rating, review: reviewText }));
  };

  // === RENDER LOGIC ===

  // 1. Invalid URL State
  if (!vendorId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center transform hover:scale-105 transition-transform duration-300">
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
          <p className="text-gray-600 mb-6 leading-relaxed">
            The vendor link appears to be broken or invalid. Please check the
            URL and try again.
          </p>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-6 text-left border border-gray-200">
            <p className="text-sm text-gray-600 font-mono break-all">
              <span className="font-semibold text-gray-800">Slug:</span> &quot;
              {slug || "none"}&quot;
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // 2. Not Found State (No data in Redux store)
  if (!vendorToDisplay) {
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
              Vendor Not Found
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              The profile you are looking for is not loaded in the application.
              It might not exist or the page was navigated to directly.
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-8 space-y-3 border border-gray-200">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="font-semibold text-gray-700">Vendor ID:</span>
              <span className="text-gray-900 font-mono">{vendorId}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-gray-700">Slug:</span>
              <span className="text-gray-900 font-mono text-sm break-all">
                {slug}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Try Reloading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Success State: Display vendor profile
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <main className="max-w-7xl mx-auto py-8 px-4 md:py-12 md:px-8 lg:px-12">
        {/* Desktop Layout Enhancement */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content (Vendor Detail) - Takes 3/4 on large screens */}
          <div className="lg:col-span-3">
            <VendorProfileDetail vendor={vendorToDisplay} />
          </div>

          {/* Sidebar (Contact Button & Rating) - Takes 1/4 on large screens */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Contact Card */}
            <div className="sticky top-20 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Ready to Book?
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect with <strong>{vendorToDisplay.name}</strong> now to
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
        {/* End Desktop Layout Enhancement */}
      </main>
    </div>
  );
};

export default VendorProfilePage;