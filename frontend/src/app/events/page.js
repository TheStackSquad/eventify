"use client";

import { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import EventSearch from "@/components/events/eventSearch";
import FilterControls from "@/components/events/category";
import EventsUI from "@/components/events/eventsUI";
import EventsFooter from "@/components/events/eventsFooter";
import { MapPin } from "lucide-react";

// 🎯 FIX: Import the correct thunk action for fetching ALL events
import { fetchAllEvents } from "@/redux/action/eventAction"; // Changed from fetchUserEvents

// Configuration for infinite scroll simulation
const EVENTS_PER_LOAD = 8;

const normalizeEvents = (rawEvents) => {
  if (!rawEvents || !Array.isArray(rawEvents)) return [];

  return rawEvents.map((event) => {
    // Helper function to format ISO date string
    const formatDate = (isoDate) => {
      if (!isoDate) return "Date N/A";
      return new Date(isoDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }; // Helper function to format ISO time string

    const formatTime = (isoDate) => {
      if (!isoDate) return "Time N/A";
      return new Date(isoDate).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const startingPrice = event.tickets?.[0]?.price ?? 0; // Determine the tag based on criteria

    let tag = "New";
    if (startingPrice === 0) {
      tag = "Free Ticket";
    } else if (startingPrice > 10000) {
      tag = "Trending";
    } // Include the like state and count from the Redux store (important for EventCard)

    const isLikedByUser = event.isLikedByUser || false;
    const likeCount = event.likeCount || 0;

    return {
      id: event.id,
      title: event.eventTitle,
      category: event.category,
      image: event.eventImage,
      price: startingPrice,
      isFree: startingPrice === 0,
      tag: tag, // 💡 NEW: Include dynamic like state for EventCard

      isLikedByUser: isLikedByUser,
      likeCount: likeCount, // Pre-formatted fields for the UI layer (EventCard props)

      date: formatDate(event.startDate),
      time: formatTime(event.startDate),
      location: `${event.venueName || "Venue N/A"}, ${event.city || "N/A"}`, // Data used only for filtering

      filterTitle: event.eventTitle.toLowerCase(),
      filterCity: event.city?.trim() || "N/A", // Trim city name for cleaner comparison and list generation
    };
  });
};

export default function EventsPage() {
  const dispatch = useDispatch(); // Redux state selection

  const eventsState = useSelector((state) => state.events); // 🎯 FIX 1: Use the correct state field for ALL events and its corresponding status. // Based on the reducer, these are likely `allEvents` and `allEventsStatus`.

  const eventsStatus = eventsState?.allEventsStatus ?? "idle";
  const rawEvents = useMemo(
    () => eventsState?.allEvents || [], // 🎯 Changed from userEvents to allEvents
    [eventsState?.allEvents] // 🎯 Changed dependency to allEvents
  ); // ----------------------------------------------------------- // 🎯 FIX 2: FETCH EVENTS ON MOUNT with improved status check // -----------------------------------------------------------

  useEffect(() => {
    // We only fetch if the status is 'idle' (first load)
    // OR if it 'failed' AND we have no data, allowing a retry on initial failure.
    if (
      eventsStatus === "idle" ||
      (eventsStatus === "failed" && rawEvents.length === 0)
    ) {
      // 🎯 Dispatch the correct action for the public listing page
      dispatch(fetchAllEvents()); // Changed from fetchUserEvents
    } // Dependencies: dispatch is stable. The effect runs only when the status // changes to 'idle' or on initial mount. The `rawEvents.length` dependency // is included for the 'failed, no data' retry condition.
  }, [dispatch, eventsStatus, rawEvents.length]); // ----------------------------------------------------------- // Local state for UI controls
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Locations"); // State for infinite scroll

  const [displayedEventsCount, setDisplayedEventsCount] =
    useState(EVENTS_PER_LOAD);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // =============================================== // DATA TRANSFORMATION AND FILTER OPTIONS GENERATION (No change needed here) // =============================================== // 1. Normalized events list from Redux

  const EVENTS_DATA_SOURCE = useMemo(
    () => normalizeEvents(rawEvents),
    [rawEvents]
  ); // 2. Deriving Filter Data from the normalized source

  const allCategories = useMemo(
    () => [
      "All",
      ...new Set(
        EVENTS_DATA_SOURCE.map((event) => event.category).filter(Boolean)
      ),
    ],
    [EVENTS_DATA_SOURCE]
  );

  const locations = useMemo(
    () => [
      "All Locations",
      ...new Set(
        EVENTS_DATA_SOURCE.map((event) => event.filterCity).filter(Boolean)
      ),
    ],
    [EVENTS_DATA_SOURCE]
  ); // 3. Filtering Logic (Memoized)

  const filteredEvents = useMemo(() => {
    return EVENTS_DATA_SOURCE.filter((event) => {
      // Use the pre-lowercased filterTitle field for search
      const matchesSearch = event.filterTitle.includes(
        searchTerm.toLowerCase()
      );

      const matchesCategory =
        selectedCategory === "All" || event.category === selectedCategory; // Use the filterCity field for location filtering

      const matchesLocation =
        selectedLocation === "All Locations" ||
        event.filterCity === selectedLocation;

      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [EVENTS_DATA_SOURCE, searchTerm, selectedCategory, selectedLocation]); // Slice the filtered list for display based on the count state (Pagination Logic)

  const displayedEvents = useMemo(() => {
    return filteredEvents.slice(0, displayedEventsCount);
  }, [filteredEvents, displayedEventsCount]); // Determine if there are more events to load

  const hasMore = displayedEventsCount < filteredEvents.length; // 4. Infinite Scroll/Load More Handler

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true); // Simulate network delay for loading more data

      setTimeout(() => {
        setDisplayedEventsCount((prevCount) => prevCount + EVENTS_PER_LOAD);
        setIsLoadingMore(false);
      }, 800);
    }
  }; // 5. Reset display count when filters change

  useEffect(() => {
    // Always reset the displayed count to the initial load amount whenever a filter changes
    setDisplayedEventsCount(EVENTS_PER_LOAD);
  }, [searchTerm, selectedCategory, selectedLocation]); // 6. Loading state while Redux data is being fetched // 🎯 FIX: Use the correct status field for all events

  if (eventsStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-body">
               {" "}
        <div className="max-w-7xl mx-auto text-center">
                   {" "}
          <div className="text-lg text-gray-600">Loading events...</div>       {" "}
        </div>
             {" "}
      </div>
    );
  } // 7. Error state // 🎯 FIX: Use the correct status field for all events

  if (eventsStatus === "failed" && rawEvents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-body">
               {" "}
        <div className="max-w-7xl mx-auto text-center">
                   {" "}
          <div className="text-lg text-red-600">
                        Error loading events. Please try again.          {" "}
          </div>
                 {" "}
        </div>
             {" "}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-body">
           {" "}
      <div className="max-w-7xl mx-auto">
                {/* 1. Top Section: Headline & Search */}       {" "}
        <section className="mb-8">
                   {" "}
          <h1 className="text-4xl font-extrabold text-gray-900 mb-6 font-header">
                        Explore Exciting Events          {" "}
          </h1>
                   {" "}
          {/* Unified Control Bar for Search and Filters (Responsive Stacking) */}
                   {" "}
          <div className="space-y-4 lg:space-y-0 lg:flex lg:justify-between lg:items-end lg:gap-6">
                       {" "}
            {/* Search (Takes full width on mobile, 2/3 on desktop) */}         
             {" "}
            <div className="lg:w-1/3">
                           {" "}
              <EventSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
                         {" "}
            </div>
                       {" "}
            {/* Category and Location Filters (Takes full width on mobile, 1/3 on desktop) */}
                       {" "}
            <div className="lg:w-2/3">
                           {" "}
              {/* FilterControls is assumed to handle category and location dropdowns */}
                           {" "}
              <FilterControls
                categories={allCategories} // Passed dynamically from Redux data
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                locations={locations} // Passed dynamically from Redux data
                selectedLocation={selectedLocation}
                onLocationChange={setSelectedLocation}
              />
                         {" "}
            </div>
                     {" "}
          </div>
                   {" "}
          {/* Location Info (Moved below filters for better organization) */}   
               {" "}
          <div className="mt-4 flex items-center justify-start text-sm text-gray-600 font-body">
                        <MapPin className="w-4 h-4 mr-1 text-red-500" />{" "}
            Currently             Filtering: Lagos, Nigeria          {" "}
          </div>
                 {" "}
        </section>
                {/* 2. Event Grid */}       {" "}
        <section className="mt-8">
                   {" "}
          <h2 className="text-2xl font-semibold text-gray-900 font-header mb-4">
                        {filteredEvents.length} Results          {" "}
          </h2>
                   {" "}
          {/* Passing the clean, displayed (paginated) events to the UI */}
                    <EventsUI events={displayedEvents} />       {" "}
        </section>
                {/* 3. Footer/Loading Trigger */}       {" "}
        <footer>
                   {" "}
          <EventsFooter
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={handleLoadMore}
          />
                 {" "}
        </footer>
             {" "}
      </div>
         {" "}
    </div>
  );
}
