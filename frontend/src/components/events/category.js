//frontend/src/components/events/category.js

import { MapPin, Calendar, Tag, DollarSign, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { allCategories } from "@/data/upcomingEvents";

export default function FilterControls({
  selectedCategory = "All", // Default value
  onCategoryChange = () => {}, // Default empty function
  locations = ["All Locations"], // Default locations
  selectedLocation = "All Locations", // Default value
  onLocationChange = () => {}, // Default empty function
}) {
  // Safe event handlers with validation
  const handleCategoryChange = (category) => {
    if (typeof onCategoryChange === "function") {
      onCategoryChange(category);
    }
  };

  const handleLocationChange = (location) => {
    if (typeof onLocationChange === "function") {
      onLocationChange(location);
    }
  };

  // Ensure locations is always an array and has at least one item
  const safeLocations =
    Array.isArray(locations) && locations.length > 0
      ? locations
      : ["All Locations"];

  // Ensure selected values are valid or fall back to defaults
  const safeSelectedCategory = selectedCategory || "All";
  const safeSelectedLocation = selectedLocation || safeLocations[0];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white rounded-xl shadow-md mb-8">
      {/* Location Dropdown */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="relative font-body lg:w-1/4"
      >
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <select
          value={safeSelectedLocation}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="appearance-none w-full py-3 pl-10 pr-8 border border-gray-300 bg-gray-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-warm-yellow-500 text-gray-700 cursor-pointer"
        >
          {safeLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </motion.div>

      {/* Category Tags */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex overflow-x-auto whitespace-nowrap gap-3 py-2 lg:w-3/4"
      >
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`
              flex items-center px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 shadow-sm
              ${
                safeSelectedCategory === cat
                  ? "bg-blue-600 text-white shadow-blue-300/50 hover:bg-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } font-body whitespace-nowrap
            `}
          >
            {cat === "All" ? <Tag className="w-4 h-4 mr-1" /> : null}
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Additional Filters (Mockups for Date and Price) */}
      <div className="flex gap-4">
        <button className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-body shadow-sm">
          <Calendar className="w-4 h-4 mr-2" /> Date
        </button>
        <button className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-body shadow-sm">
          <DollarSign className="w-4 h-4 mr-2" /> Price Range
        </button>
      </div>
    </div>
  );
}
