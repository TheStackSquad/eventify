
// src/components/events/hero/EventsHero.jsx

import { Search } from "lucide-react";

export default function EventsHero({ searchTerm, onSearchChange }) {
  return (
    <div className="bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight">
          Discover Amazing Events
        </h1>
        <p className="text-lg sm:text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
          Find the perfect event for you in Lagos, Nigeria
        </p>

        {/* Large Search Bar */}
        <div className="relative max-w-3xl mx-auto text-white">
          <div className="relative text-white">
            {/* Search Icon */}
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-100 w-6 h-6" />
            <input
              type="text"
              placeholder="Search for events, artists, or venues..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-16 pl-16 pr-6 text-gray-100 text-lg rounded-full shadow-2xl
              focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all placeholder-gray-100"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 flex justify-center items-center gap-6 text-sm text-orange-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live Events</span>
          </div>
          <div>•</div>
          <div>1000+ Events This Month</div>
          <div>•</div>
          <div>Lagos, Nigeria</div>
        </div>
      </div>
    </div>
  );
}
