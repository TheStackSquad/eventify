// frontend/src/components/vendorUI/VendorListingView.js
import React from "react";
import VendorHero from "./vendorHero";
import VendorCTA from "./vendorCTA";
import VendorGrid from "./vendorGrid";
import VendorStats from "./vendorStats";

const VendorListingView = ({
  vendors,
  filters,
  onRegisterClick,
  onFilterChange,
}) => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Hero Section */}
      <VendorHero />

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Call-to-Action Card */}
        <VendorCTA onRegisterClick={onRegisterClick} />

        {/* Filter Bar Placeholder */}
        {/* <VendorFilterBar filters={filters} onFilterChange={onFilterChange} /> */}

        {/* Stats/Results Count */}
        <VendorStats count={vendors.length} />

        {/* Vendor Grid */}
        <VendorGrid vendors={vendors} />
      </div>
    </main>
  );
};

export default VendorListingView;
