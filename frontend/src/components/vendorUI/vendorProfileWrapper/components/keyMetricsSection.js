// frontend/src/components/vendorUI/vendorProfileWrapper/components/keyMetricsSection.js
import React from "react";
import { MapPin, Star, Wallet } from "lucide-react";
import { formatNumber } from "@/utils/currency";

const KeyMetricsSection = ({ vendor }) => {
  console.log("Key Metrics Data:", vendor);

  // Directly access the flat JSON fields
  const minPrice = vendor?.minPrice || 0;
  const city = vendor?.city || "Unknown City";
  const state = vendor?.state || "Unknown State";
  const createdAt = vendor?.createdAt;

  return (
    <div className="p-5 border rounded-xl bg-gradient-to-br from-gray-50 to-white">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Key Metrics</h2>
      <ul className="space-y-3" role="list">
        {/* Location Row */}
        <li
          className="flex items-center justify-between p-3 bg-white rounded-lg border"
          role="listitem"
        >
          <div className="flex items-center text-gray-700">
            <MapPin
              size={20}
              className="mr-3 text-red-500"
              aria-hidden="true"
            />
            <span>Location</span>
          </div>
          <span className="font-semibold text-gray-800 text-right">
            <span className="block">{city}</span>
            <span className="text-sm text-gray-600">{state}</span>
          </span>
        </li>

        {/* Starting Price Row */}
        <li
          className="flex items-center justify-between p-3 bg-white rounded-lg border"
          role="listitem"
        >
          <div className="flex items-center text-gray-700">
            <Wallet
              size={20}
              className="mr-3 text-green-500"
              aria-hidden="true"
            />
            <span>Starting Price</span>
          </div>
          <span
            className="font-bold text-green-700 text-xl"
            aria-label={`Starting price: ₦${formatNumber(minPrice)}`}
          >
            ₦{formatNumber(minPrice)}
          </span>
        </li>

        {/* Member Since Row */}
        <li
          className="flex items-center justify-between p-3 bg-white rounded-lg border"
          role="listitem"
        >
          <div className="flex items-center text-gray-700">
            <Star
              size={20}
              className="mr-3 text-amber-500"
              aria-hidden="true"
            />
            <span>Member Since</span>
          </div>
          <span className="font-bold text-gray-700">
            {createdAt
              ? new Date(createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "N/A"}
          </span>
        </li>
      </ul>
    </div>
  );
};

export default KeyMetricsSection;
