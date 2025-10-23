
// src/components/events/filters/activeFilters.jsx

import { X } from "lucide-react";

export default function ActiveFilters({
  searchTerm,
  selectedCategory,
  selectedLocation,
  sortBy,
  onClearSearch,
  onClearCategory,
  onClearLocation,
  onClearSort,
  onClearAll,
}) {
  const badges = [];

  if (searchTerm) {
    badges.push({
      label: `Search: "${searchTerm}"`,
      onClear: onClearSearch,
    });
  }

  if (selectedCategory !== "All") {
    badges.push({
      label: `Category: ${selectedCategory}`,
      onClear: onClearCategory,
    });
  }

  if (selectedLocation !== "All Locations") {
    badges.push({
      label: `Location: ${selectedLocation}`,
      onClear: onClearLocation,
    });
  }

  if (sortBy !== "date-asc") {
    const sortLabel = {
      "date-desc": "Latest First",
      "price-asc": "Price: Low-High",
      "price-desc": "Price: High-Low",
      location: "Location A-Z",
    }[sortBy];

    badges.push({
      label: `Sort: ${sortLabel}`,
      onClear: onClearSort,
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-600">Active filters:</span>

      {badges.map((badge, index) => (
        <button
          key={index}
          onClick={badge.onClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors group"
        >
          <span>{badge.label}</span>
          <X className="w-3.5 h-3.5 group-hover:text-orange-900" />
        </button>
      ))}

      <button
        onClick={onClearAll}
        className="text-sm font-medium text-orange-600 hover:text-orange-700 underline ml-2"
      >
        Clear all
      </button>
    </div>
  );
}