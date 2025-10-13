// frontend/src/app/vendor/page.js
"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVendors } from "@/redux/action/vendorAction";
import { setVendorFilters } from "@/redux/reducer/vendorReducer";
import { STATUS } from "@/utils/constants/globalConstants";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import VendorCard from "@/components/vendorUI/vendorCard";


const VendorListingPage = () => {
  const dispatch = useDispatch();
  const { vendors, status, error, filters } = useSelector(
    (state) => state.vendors
  );

  const isLoading = status === STATUS.LOADING;

  // Fetch vendors whenever the page loads or filters change
  useEffect(() => {
    // The fetchVendors thunk takes the filter object as its payload
    dispatch(fetchVendors(filters));
  }, [dispatch, filters]);

  // Optional: Handler to update filters from the FilterBar component
  const handleFilterChange = (newFilters) => {
    dispatch(setVendorFilters(newFilters));
  };

  if (isLoading && vendors.length === 0) {
    return (
      <LoadingSpinner
        fullScreen={true}
        message="Searching for top-rated vendors..."
        subMessage="This may take a moment to load all services."
      />
    );
  }

  if (error) {
    return (
      <div className="text-center p-10 bg-red-50 text-red-700">
        <h2 className="text-xl font-semibold">Failed to Load Vendors</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Discover Top Event Vendors
      </h1>

      {/* Filter Bar goes here: <VendorFilterBar filters={filters} onFilterChange={handleFilterChange} /> */}

      <p className="text-gray-600 mb-6">
        Showing **{vendors.length}** service providers matching your criteria.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.length > 0 ? (
          vendors.map((vendor) => (
            // Map the vendor data to the reusable Card component
            <VendorCard key={vendor.id} vendor={vendor} />
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-xl shadow-inner">
            <h2 className="text-2xl font-semibold text-gray-700">
              No Vendors Found
            </h2>
            <p className="text-gray-500 mt-2">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default VendorListingPage;
