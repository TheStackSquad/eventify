
//src/components/events/filters/FilterBar.jsx

import { MapPin, ArrowUpDown } from "lucide-react";

export default function FilterBar({
  location,
  onLocationChange,
  locations,
  sortBy,
  onSortChange,
  resultsCount,
  isSticky,
}) {
  const sortOptions = [
    { value: "date-asc", label: "Date: Soonest First" },
    { value: "date-desc", label: "Date: Latest First" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "location", label: "Location: A-Z" },
  ];

  return (
    <div
      className={`
        bg-white border-b border-gray-200 transition-all duration-300
        ${isSticky ? "sticky top-0 z-40 shadow-md" : ""}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Results Count */}
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {resultsCount} {resultsCount === 1 ? "Event" : "Events"}
            </h2>
          </div>

          {/* Right: Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
