// frontend/src/app/events/page.test.js

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import EventsPage from "./page";

// Mock IntersectionObserver globally since it's not available in Jest DOM
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Suppress console logs during tests
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "debug").mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.debug.mockRestore();
});

// Mock Redux actions - fix the thunk implementation
jest.mock("@/redux/action/eventAction", () => {
  return {
    fetchAllEvents: jest.fn(() => ({
      type: "events/fetchAllEvents",
      payload: Promise.resolve([]),
    })),
    createEvent: jest.fn(() => ({
      type: "events/createEvent",
    })),
    getEventById: jest.fn(() => ({
      type: "events/getEventById",
    })),
  };
});

// Mock the child components
jest.mock("@/components/events/hero/eventsHero", () => {
  return function MockEventsHero({ searchTerm, onSearchChange }) {
    return (
      <div data-testid="events-hero">
        <input
          data-testid="search-input"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
        />
      </div>
    );
  };
});

jest.mock("@/components/events/hero/categoryPills", () => {
  return function MockCategoryPills({
    categories,
    selectedCategory,
    onCategoryChange,
  }) {
    return (
      <div data-testid="category-pills">
        {categories.map((category) => (
          <button
            key={category}
            data-testid={`category-${category}`}
            data-selected={selectedCategory === category}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock("@/components/events/filters/filterBar", () => {
  return function MockFilterBar({
    location,
    onLocationChange,
    locations,
    sortBy,
    onSortChange,
    resultsCount,
    isSticky,
  }) {
    return (
      <div data-testid="filter-bar" data-sticky={isSticky}>
        <select
          data-testid="location-select"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
        >
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <select
          data-testid="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="date-asc">Date Ascending</option>
          <option value="date-desc">Date Descending</option>
          <option value="price-asc">Price Low to High</option>
          <option value="price-desc">Price High to Low</option>
          <option value="location">Location</option>
        </select>
        <span data-testid="results-count">{resultsCount} results</span>
      </div>
    );
  };
});

jest.mock("@/components/events/filters/activeFilters", () => {
  return function MockActiveFilters({
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
    return (
      <div data-testid="active-filters">
        {searchTerm && (
          <button data-testid="clear-search" onClick={onClearSearch}>
            Clear Search: {searchTerm}
          </button>
        )}
        {selectedCategory !== "All" && (
          <button data-testid="clear-category" onClick={onClearCategory}>
            Clear Category: {selectedCategory}
          </button>
        )}
        {selectedLocation !== "All Locations" && (
          <button data-testid="clear-location" onClick={onClearLocation}>
            Clear Location: {selectedLocation}
          </button>
        )}
        {sortBy !== "date-asc" && (
          <button data-testid="clear-sort" onClick={onClearSort}>
            Clear Sort: {sortBy}
          </button>
        )}
        <button data-testid="clear-all" onClick={onClearAll}>
          Clear All
        </button>
      </div>
    );
  };
});

jest.mock("@/components/events/eventsUI", () => {
  return function MockEventsUI({ events }) {
    return (
      <div data-testid="events-ui">
        {events.map((event) => (
          <div key={event.id} data-testid={`event-${event.id}`}>
            <h3>{event.title}</h3>
            <p>Price: ${(event.price / 100).toFixed(2)}</p>
            <p>Category: {event.category}</p>
            <p>Location: {event.location}</p>
            <p>Date: {event.date}</p>
            {event.tag && (
              <span data-testid={`event-tag-${event.id}`}>{event.tag}</span>
            )}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("@/components/events/eventsFooter", () => {
  return function MockEventsFooter({ hasMore, isLoading, onLoadMore }) {
    return (
      <div data-testid="events-footer">
        {hasMore && (
          <button
            data-testid="load-more"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    );
  };
});

// Simple mock reducer for testing
const createMockEventsReducer = () => {
  return (
    state = {
      allEvents: [],
      allEventsStatus: "idle",
      status: "idle",
      error: null,
    },
    action
  ) => {
    switch (action.type) {
      case "events/fetchAllEvents/pending":
        return { ...state, allEventsStatus: "loading" };
      case "events/fetchAllEvents/fulfilled":
        return {
          ...state,
          allEventsStatus: "succeeded",
          allEvents: action.payload || [],
        };
      case "events/fetchAllEvents/rejected":
        return {
          ...state,
          allEventsStatus: "failed",
          error: action.error,
        };
      default:
        return state;
    }
  };
};

// Create mock store utility with middleware to handle thunks
const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      events: createMockEventsReducer(),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: true,
        serializableCheck: false,
        immutableCheck: false,
      }),
    preloadedState: {
      events: {
        allEvents: [],
        allEventsStatus: "idle",
        status: "idle",
        error: null,
        ...preloadedState.events,
      },
    },
  });
};

// Mock events data - fix the city names to match your actual data
const mockEvents = [
  {
    id: "1",
    eventTitle: "Concert Night",
    category: "Music",
    eventImage: "/concert.jpg",
    tickets: [{ price: 5000 }],
    startDate: "2025-12-01T19:00:00Z",
    venueName: "Music Hall",
    city: "Ogun",
    isLikedByUser: false,
    likeCount: 10,
  },
  {
    id: "2",
    eventTitle: "Art Workshop",
    category: "Art",
    eventImage: "/art.jpg",
    tickets: [{ price: 0 }],
    startDate: "2025-12-02T14:00:00Z",
    venueName: "Art Center",
    city: "Lagos",
    isLikedByUser: true,
    likeCount: 5,
  },
  {
    id: "3",
    eventTitle: "Tech Conference",
    category: "Technology",
    eventImage: "/tech.jpg",
    tickets: [{ price: 15000 }],
    startDate: "2025-12-03T09:00:00Z",
    venueName: "Convention Center",
    city: "Oyo",
    isLikedByUser: false,
    likeCount: 20,
  },
];

describe("EventsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    const store = createMockStore({
      events: {
        allEventsStatus: "loading",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    expect(screen.getByText("Loading events...")).toBeInTheDocument();
  });

  it("renders error state when fetch fails", () => {
    const store = createMockStore({
      events: {
        allEventsStatus: "failed",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    expect(
      screen.getByText("Error loading events. Please try again.")
    ).toBeInTheDocument();
  });

  it("renders events successfully", () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    expect(screen.getByTestId("events-hero")).toBeInTheDocument();
    expect(screen.getByTestId("category-pills")).toBeInTheDocument();
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("events-ui")).toBeInTheDocument();

    // Check if events are rendered
    expect(screen.getByTestId("event-1")).toHaveTextContent("Concert Night");
    expect(screen.getByTestId("event-2")).toHaveTextContent("Art Workshop");
    expect(screen.getByTestId("event-3")).toHaveTextContent("Tech Conference");
  });

  it("normalizes event data correctly", () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    // Check normalized data - prices should be displayed as dollars
    const event1 = screen.getByTestId("event-1");
    expect(event1).toHaveTextContent("$50.00"); // $5000 normalized to $50.00
    expect(event1).toHaveTextContent("Music Hall, Ogun"); // Fixed to match actual city

    const event2 = screen.getByTestId("event-2");
    expect(event2).toHaveTextContent("$0.00");
    expect(screen.getByTestId("event-tag-2")).toHaveTextContent("Free Ticket");

    const event3 = screen.getByTestId("event-3");
    expect(event3).toHaveTextContent("$150.00");
    expect(screen.getByTestId("event-tag-3")).toHaveTextContent("Trending");
  });

  it("handles search functionality", async () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "concert" } });

    await waitFor(() => {
      expect(screen.getByTestId("event-1")).toBeInTheDocument();
      expect(screen.queryByTestId("event-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("event-3")).not.toBeInTheDocument();
    });
  });

  it("filters events by category", async () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    const artCategory = screen.getByTestId("category-Art");
    fireEvent.click(artCategory);

    await waitFor(() => {
      expect(screen.getByTestId("event-2")).toBeInTheDocument();
      expect(screen.queryByTestId("event-1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("event-3")).not.toBeInTheDocument();
    });
  });

  it("filters events by location", async () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    const locationSelect = screen.getByTestId("location-select");
    fireEvent.change(locationSelect, { target: { value: "Lagos" } }); // Fixed to match actual city

    await waitFor(() => {
      expect(screen.getByTestId("event-2")).toBeInTheDocument();
      expect(screen.queryByTestId("event-1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("event-3")).not.toBeInTheDocument();
    });
  });

  it("sorts events by price ascending", async () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    const sortSelect = screen.getByTestId("sort-select");
    fireEvent.change(sortSelect, { target: { value: "price-asc" } });

    await waitFor(() => {
      const events = screen.getAllByTestId(/event-\d/);
      // Should be sorted by price ascending: Free -> $50 -> $150
      expect(events[0]).toHaveTextContent("Art Workshop");
      expect(events[1]).toHaveTextContent("Concert Night");
      expect(events[2]).toHaveTextContent("Tech Conference");
    });
  });

  it("handles load more functionality", async () => {
    const manyEvents = Array.from({ length: 12 }, (_, i) => ({
      id: `${i + 1}`,
      eventTitle: `Event ${i + 1}`,
      category: "Music",
      eventImage: "/image.jpg",
      tickets: [{ price: 1000 }],
      startDate: "2025-12-01T19:00:00Z",
      venueName: "Venue",
      city: "City",
    }));

    const store = createMockStore({
      events: {
        allEvents: manyEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    // Initially should show 8 events (EVENTS_PER_LOAD)
    expect(screen.getAllByTestId(/event-\d/)).toHaveLength(8);

    const loadMoreButton = screen.getByTestId("load-more");
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      // Should now show all 12 events
      expect(screen.getAllByTestId(/event-\d/)).toHaveLength(12);
    });
  });

  it("clears all filters correctly", async () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    // Apply some filters
    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "tech" } });

    const techCategory = screen.getByTestId("category-Technology");
    fireEvent.click(techCategory);

    // Wait for active filters to appear
    await waitFor(() => {
      expect(screen.getByTestId("active-filters")).toBeInTheDocument();
    });

    // Clear all filters
    const clearAllButton = screen.getByTestId("clear-all");
    fireEvent.click(clearAllButton);

    await waitFor(() => {
      expect(searchInput.value).toBe("");
      expect(screen.queryByTestId("active-filters")).not.toBeInTheDocument();
      // All events should be visible again
      expect(screen.getAllByTestId(/event-\d/)).toHaveLength(3);
    });
  });

  it("handles events with missing data gracefully", () => {
    const eventsWithMissingData = [
      {
        id: "1",
        eventTitle: "Incomplete Event",
        category: null,
        eventImage: null,
        tickets: null,
        startDate: null,
        venueName: null,
        city: null,
      },
    ];

    const store = createMockStore({
      events: {
        allEvents: eventsWithMissingData,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    const event = screen.getByTestId("event-1");
    expect(event).toHaveTextContent("Incomplete Event");
    expect(event).toHaveTextContent("Venue N/A, N/A");
    expect(event).toHaveTextContent("Date N/A");
  });

  it("shows active filters when filters are applied", async () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    // Initially no active filters
    expect(screen.queryByTestId("active-filters")).not.toBeInTheDocument();

    // Apply search filter
    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      expect(screen.getByTestId("active-filters")).toBeInTheDocument();
    });
  });

  it("displays correct categories from events data", () => {
    const store = createMockStore({
      events: {
        allEvents: mockEvents,
        allEventsStatus: "succeeded",
      },
    });

    render(
      <Provider store={store}>
        <EventsPage />
      </Provider>
    );

    // Should have All + unique categories from mockEvents
    expect(screen.getByTestId("category-All")).toBeInTheDocument();
    expect(screen.getByTestId("category-Music")).toBeInTheDocument();
    expect(screen.getByTestId("category-Art")).toBeInTheDocument();
    expect(screen.getByTestId("category-Technology")).toBeInTheDocument();
  });
});
