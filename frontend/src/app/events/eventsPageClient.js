// src/app/events/eventsPageClient.js

"use client";

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useTransition,
  useDeferredValue,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchEvents } from "@/utils/hooks/useSearchEvents";
import { fetchAllEventsApi } from "@/services/eventsApi";
import AISuggestions from "@/components/events/AISuggestions";
import EventsHero from "@/components/events/hero/eventsHero";
import CategoryPills from "@/components/events/hero/categoryPills";
import FilterBar from "@/components/events/filters/filterBar";
import ActiveFilters from "@/components/events/filters/activeFilters";
import EventsUI from "@/components/events/eventsUI";
import EventsFooter from "@/components/events/eventsFooter";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENTS_PER_PAGE = 8;

const SORT_OPTIONS = {
  "date-asc": (a, b) => new Date(a.startDate) - new Date(b.startDate),
  "date-desc": (a, b) => new Date(b.startDate) - new Date(a.startDate),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
};

// ---------------------------------------------------------------------------
// Pure helpers — defined once, outside the component
// ---------------------------------------------------------------------------

const formatDate = (isoDate) => {
  if (!isoDate) return "Date N/A";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (isoDate) => {
  if (!isoDate) return "Time N/A";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const deriveTag = (price) => {
  if (price === 0) return "Free Ticket";
  if (price > 10000) return "Trending";
  return "New";
};

/**
 * Normalize a single raw event from the API into the shape the UI expects.
 */
const normalizeEvent = (event) => {
  const price = event.tickets?.[0]?.price ?? 0;
  return {
    id: event.id,
    title: event.eventTitle,
    category: event.category,
    image: event.eventImage,
    price,
    isFree: price === 0,
    tag: deriveTag(price),
    date: formatDate(event.startDate),
    time: formatTime(event.startDate),
    location: `${event.venueName || "Venue N/A"}, ${event.city || "N/A"}`,
    // Lowercased copies for fast client-side filter matching
    filterTitle: event.eventTitle?.toLowerCase() ?? "",
    filterCity: event.city?.trim() ?? "N/A",
    // Keep raw date for sorting
    startDate: event.startDate,
  };
};

const normalizeEvents = (rawEvents) =>
  Array.isArray(rawEvents) ? rawEvents.map(normalizeEvent) : [];

// ---------------------------------------------------------------------------
// Pagination query key factory
// ---------------------------------------------------------------------------

const eventsPageKey = (page) => ["events", "paginated", { page }];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventsPageClient({ initialEvents }) {
  // --- Refs ----------------------------------------------------------------
  const heroRef = useRef(null);

  // --- UI State ------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [isPending, startTransition] = useTransition();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [sortBy, setSortBy] = useState("date-asc");
  const [isFilterSticky, setIsFilterSticky] = useState(false);

  // --- Server-side pagination state ----------------------------------------
  const [currentPage, setCurrentPage] = useState(0); // 0-based offset pages
  const [accumulatedEvents, setAccumulatedEvents] = useState(() =>
    normalizeEvents(initialEvents),
  );
  const [totalCount, setTotalCount] = useState(initialEvents?.length ?? 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // --- Search query --------------------------------------------------------
  const { data: searchData, isFetching: isSearching } =
    useSearchEvents(deferredSearchTerm);

  // Only show AI suggestions when there are zero DB results for the query
  const aiSuggestions =
    deferredSearchTerm && searchData?.dbResults?.length === 0
      ? (searchData?.aiSuggestions ?? [])
      : [];

  // --- Load-more query (server-side pagination) ----------------------------
  // This only runs when the user clicks "Load More" (currentPage > 0).
  // Page 0 is handled by initialEvents (SSR/SSG), so we skip that fetch.
  const { data: pageData, isFetching: isFetchingPage } = useQuery({
    queryKey: eventsPageKey(currentPage),
    queryFn: () =>
      fetchAllEventsApi({
        limit: EVENTS_PER_PAGE,
        offset: currentPage * EVENTS_PER_PAGE,
      }),
    enabled: currentPage > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Accumulate pages as they arrive
  useEffect(() => {
    if (!pageData) return;

    const newEvents = normalizeEvents(pageData.events);
    setTotalCount(pageData.total ?? totalCount);
    setAccumulatedEvents((prev) => {
      // Deduplicate by id in case of concurrent fetches or re-renders
      const existingIds = new Set(prev.map((e) => e.id));
      const deduped = newEvents.filter((e) => !existingIds.has(e.id));
      return [...prev, ...deduped];
    });
    setIsLoadingMore(false);
  }, [pageData]);

  // --- Derived category / location lists -----------------------------------
  // Built from the accumulated events so new pages expand the filter options
  const allCategories = useMemo(
    () => [
      "All",
      ...new Set(accumulatedEvents.map((e) => e.category).filter(Boolean)),
    ],
    [accumulatedEvents],
  );

  const locations = useMemo(
    () => [
      "All Locations",
      ...new Set(accumulatedEvents.map((e) => e.filterCity).filter(Boolean)),
    ],
    [accumulatedEvents],
  );

  // --- Core filtering + sorting pipeline -----------------------------------
  const filteredAndSortedEvents = useMemo(() => {
    // 1. Source: API search results OR local accumulated events
    const source =
      deferredSearchTerm && searchData?.dbResults
        ? normalizeEvents(searchData.dbResults) // search results arrive un-normalized
        : accumulatedEvents;

    // 2. Apply category + location filters on top of whichever source
    const filtered = source.filter((event) => {
      const matchesSearch = deferredSearchTerm
        ? event.filterTitle.includes(deferredSearchTerm.toLowerCase())
        : true;
      const matchesCategory =
        selectedCategory === "All" || event.category === selectedCategory;
      const matchesLocation =
        selectedLocation === "All Locations" ||
        event.filterCity === selectedLocation;

      return matchesSearch && matchesCategory && matchesLocation;
    });

    // 3. Sort — SORT_OPTIONS[sortBy] is always defined; fallback is a no-op
    const sorter = SORT_OPTIONS[sortBy] ?? SORT_OPTIONS["date-asc"];
    return [...filtered].sort(sorter);
  }, [
    accumulatedEvents,
    deferredSearchTerm,
    searchData,
    selectedCategory,
    selectedLocation,
    sortBy,
  ]);

  // --- Pagination state derived from server response -----------------------
  const hasMore = !deferredSearchTerm && accumulatedEvents.length < totalCount;

  // --- Active filter flag --------------------------------------------------
  const hasActiveFilters =
    searchTerm !== "" ||
    selectedCategory !== "All" ||
    selectedLocation !== "All Locations" ||
    sortBy !== "date-asc";

  // --- Event handlers ------------------------------------------------------
  const handleCategoryChange = useCallback((category) => {
    startTransition(() => setSelectedCategory(category));
  }, []);

  const handleLocationChange = useCallback((location) => {
    startTransition(() => setSelectedLocation(location));
  }, []);

  const handleSortChange = useCallback((sort) => {
    startTransition(() => setSortBy(sort));
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isFetchingPage) return;
    setIsLoadingMore(true);
    setCurrentPage((prev) => prev + 1);
  }, [hasMore, isLoadingMore, isFetchingPage]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedLocation("All Locations");
    setSortBy("date-asc");
  }, []);

  // --- Sticky filter observer ----------------------------------------------
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsFilterSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" },
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  // --- Empty state ---------------------------------------------------------
  if (!initialEvents || initialEvents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg text-gray-600">
            No events available at the moment. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // --- Render --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50">
      {/* Hero — observed for sticky filter trigger */}
      <div ref={heroRef}>
        <EventsHero searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </div>

      {/* Category pills */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CategoryPills
            categories={allCategories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </div>

      {/* Filter bar — becomes sticky when hero scrolls out */}
      <FilterBar
        location={selectedLocation}
        onLocationChange={handleLocationChange}
        locations={locations}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        resultsCount={filteredAndSortedEvents.length}
        isSticky={isFilterSticky}
      />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active filter chips */}
        {hasActiveFilters && (
          <ActiveFilters
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            selectedLocation={selectedLocation}
            sortBy={sortBy}
            onClearSearch={() => setSearchTerm("")}
            onClearCategory={() => setSelectedCategory("All")}
            onClearLocation={() => setSelectedLocation("All Locations")}
            onClearSort={() => setSortBy("date-asc")}
            onClearAll={handleClearFilters}
          />
        )}

        {/* Transition feedback — only shown during the deferred gap */}
        {searchTerm !== deferredSearchTerm && (
          <div className="mb-4 p-2 bg-blue-50 rounded text-sm text-blue-700">
            Updating results…
          </div>
        )}

        {/* Content area — dims during concurrent transitions */}
        <div
          style={{
            opacity: isPending ? 0.6 : 1,
            transition: "opacity 200ms ease",
          }}
        >
          {/* AI suggestions — only when search has no DB matches */}
          <AISuggestions suggestions={aiSuggestions} isLoading={isSearching} />

          {/* Events grid */}
          <EventsUI events={filteredAndSortedEvents} />
        </div>

        {/* Load more — hidden during active search */}
        {!deferredSearchTerm && (
          <EventsFooter
            hasMore={hasMore}
            isLoading={isLoadingMore || isFetchingPage}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  );
}