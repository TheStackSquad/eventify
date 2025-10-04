//frontend/src/app/events/page.js

"use client";

import { useState, useMemo, useEffect } from "react";
import EventSearch from "@/components/events/eventSearch";
import FilterControls from "@/components/events/category";
import EventsUI from "@/components/events/eventsUI";
import EventsFooter from "@/components/events/eventsFooter";
import { dummyEvents, allCategories } from "@/data/upcomingEvents";
import { locations } from "@/data/eventSelector";
import { MapPin } from "lucide-react";

// Configuration for infinite scroll simulation
const EVENTS_PER_LOAD = 8;

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  // State for infinite scroll
  const [displayedEventsCount, setDisplayedEventsCount] =
    useState(EVENTS_PER_LOAD);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 1. Filtering Logic: Memoize the filtered list to avoid re-calculating on every render
  const filteredEvents = useMemo(() => {
    return dummyEvents.filter((event) => {
      const matchesSearch = event.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || event.category === selectedCategory;

      const matchesLocation =
        selectedLocation === "All Locations" ||
        event.location === selectedLocation;

      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [searchTerm, selectedCategory, selectedLocation]);

  // Slice the filtered list for display based on the count state
  const displayedEvents = useMemo(() => {
    return filteredEvents.slice(0, displayedEventsCount);
  }, [filteredEvents, displayedEventsCount]);

  // Determine if there are more events to load
  const hasMore = displayedEventsCount < filteredEvents.length;

  // 2. Infinite Scroll/Load More Handler
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);

      // Simulate network delay for loading more data
      setTimeout(() => {
        setDisplayedEventsCount((prevCount) => prevCount + EVENTS_PER_LOAD);
        setIsLoadingMore(false);
      }, 800);
    }
  };

  // 3. Reset display count when filters change
  useEffect(() => {
    // Always reset the displayed count to the initial load amount whenever a filter changes
    setDisplayedEventsCount(EVENTS_PER_LOAD);
  }, [searchTerm, selectedCategory, selectedLocation]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-7xl mx-auto">
        {/* 1. Top Section: Headline & Search */}
        <section className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-6 font-header">
            Explore Exciting Events
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <EventSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
            {/* Location Selector is now integrated into the FilterControls for a cleaner layout */}
            <div className="lg:col-span-1 flex items-center justify-end text-sm text-gray-600 font-body">
              <MapPin className="w-4 h-4 mr-1 text-red-500" /> Current Location:
              Lagos
            </div>
          </div>
        </section>

        {/* 2. Filtering & Sorting Bar */}
        <section>
          <FilterControls
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
          />
        </section>

        {/* 3. Event Grid */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 font-header mb-4">
            {filteredEvents.length} Results
          </h2>
          <EventsUI events={displayedEvents} />
        </section>

        {/* 4. Footer/Loading Trigger */}
        <footer>
          <EventsFooter
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={handleLoadMore}
          />
        </footer>
      </div>
    </div>
  );
}
