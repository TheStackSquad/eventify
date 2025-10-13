// frontend/src/components/vendorUI/VendorProfileDetail.js
import React from "react";
import {
  MapPin,
  Star,
  CheckCircle,
  Briefcase,
  DollarSign,
  Mail,
  Phone,
  UserCheck,
} from "lucide-react";

/**
 * VendorProfileDetail Component
 * Displays the complete, detailed profile of a single vendor.
 */
const VendorProfileDetail = ({ vendor }) => {
  if (!vendor) {
    return (
      <div className="text-center py-20 text-gray-500">
        No vendor data available.
      </div>
    );
  }

  // Helper for formatting price (Nigerian Naira)
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 md:p-10">
      {/* Header and Verification */}
      <div className="flex flex-col md:flex-row justify-between items-start border-b pb-6 mb-6">
        {/* Name and Category */}
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-1 font-header">
            {vendor.name}
          </h1>
          <p className="text-xl text-green-600 font-semibold mb-3 capitalize">
            <Briefcase className="inline-block mr-2" size={20} />
            {vendor.category}
          </p>
        </div>

        {/* Ratings and Score */}
        <div className="flex flex-col items-end mt-4 md:mt-0">
          <div className="flex items-center text-3xl font-bold text-orange-600">
            <Star size={28} fill="currentColor" className="mr-2" />
            {vendor.pvsScore}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Based on {vendor.reviewCount} Reviews
          </p>
        </div>
      </div>

      {/* Verification and Core Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* 1. Verification Status */}
        <div className="p-5 border rounded-xl bg-indigo-50/50">
          <h2 className="text-lg font-bold text-indigo-700 mb-3 flex items-center">
            <UserCheck size={22} className="mr-2" /> Verification Status
          </h2>
          <ul className="space-y-2">
            <li className="flex items-center text-gray-700">
              <CheckCircle
                size={20}
                className={`mr-2 ${
                  vendor.isIdentityVerified ? "text-green-500" : "text-gray-400"
                }`}
              />
              Identity Verified:
              <span
                className={`ml-2 font-semibold ${
                  vendor.isIdentityVerified ? "text-green-700" : "text-red-500"
                }`}
              >
                {vendor.isIdentityVerified ? "Yes" : "Pending"}
              </span>
            </li>
            <li className="flex items-center text-gray-700">
              <CheckCircle
                size={20}
                className={`mr-2 ${
                  vendor.isBusinessRegistered
                    ? "text-green-500"
                    : "text-gray-400"
                }`}
              />
              Business Registered (CAC):
              <span
                className={`ml-2 font-semibold ${
                  vendor.isBusinessRegistered
                    ? "text-green-700"
                    : "text-red-500"
                }`}
              >
                {vendor.isBusinessRegistered ? "Yes" : "Pending"}
              </span>
            </li>
          </ul>
        </div>

        {/* 2. Key Metrics */}
        <div className="p-5 border rounded-xl bg-gray-50">
          <h2 className="text-lg font-bold text-gray-700 mb-3">Key Metrics</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center justify-between">
              <span className="flex items-center">
                <MapPin size={18} className="mr-2 text-red-500" /> Primary
                Location:
              </span>
              <span className="font-semibold">
                {vendor.city}, {vendor.state}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center">
                <DollarSign size={18} className="mr-2 text-green-600" />{" "}
                Starting Price:
              </span>
              <span className="font-semibold text-green-700">
                {formatPrice(vendor.minPrice)}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center">Bookings Completed:</span>
              <span className="font-semibold text-indigo-700">
                {vendor.bookingsCompleted}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Description / About Section (Placeholder) */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3 border-b pb-2">
          About {vendor.name}
        </h2>
        <p className="text-gray-700 leading-relaxed">
          {vendor.description ||
            `Providing professional ${vendor.category} services across ${vendor.state} and surrounding areas. We focus on delivering high-quality, reliable service for all your event needs.`}
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-green-50 p-6 rounded-xl border border-green-200">
        <h2 className="text-2xl font-bold text-green-800 mb-4">Get in Touch</h2>
        <div className="space-y-3">
          <div className="flex items-center text-lg text-green-700">
            <Mail size={20} className="mr-3" />
            <span>{vendor.email}</span>
          </div>
          {vendor.phoneNumber && (
            <div className="flex items-center text-lg text-green-700">
              <Phone size={20} className="mr-3" />
              <span>{vendor.phoneNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* NOTE: You would typically add sections here for:
                - Gallery/Portfolio Images
                - Review List
                - Service Price Packages
            */}
    </div>
  );
};

export default VendorProfileDetail;
