// frontend/src/components/vendorUI/vendorProfileWrapper/components/keyMetricsSection.js
import React from "react";
import { MapPin, Star, Wallet } from "lucide-react";
import { formatPrice } from "@/utils/currency";

const KeyMetricsSection = ({ vendor }) => {
  // rawMinPrice from backend is 65000000
  const rawMinPrice = vendor?.minPrice || 0;
  const city = vendor?.city || "Unknown City";
  const state = vendor?.state || "Unknown State";
  const createdAt = vendor?.createdAt;

  return (
    <div className="p-5 border rounded-xl bg-gradient-to-br from-gray-50 to-white">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Key Metrics</h2>
      <ul className="space-y-3" role="list">
        {/* ... Location and other rows ... */}

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
            // Accessibility: Show full Naira amount in the label
            aria-label={`Starting price: ₦${rawMinPrice / 100}`}
          >
            {formatPrice(rawMinPrice)}
          </span>
        </li>

        {/* ... Member Since Row ... */}
      </ul>
    </div>
  );
};

export default KeyMetricsSection;
