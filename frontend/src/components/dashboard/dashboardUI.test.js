// frontend/src/components/dashboard/dashboardUI.test.js

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import DashboardUI from "./dashboardUI";

// Mock framer-motion to avoid animation complications in tests
jest.mock("framer-motion", () => ({
  motion: {
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock child components
jest.mock("@/components/dashboard/myEvents", () => {
  return function MyEvents({
    liveEvents,
    upcomingEvents,
    pastEvents,
    openDeleteModal,
    openAnalyticsModal,
  }) {
    return (
      <div data-testid="my-events">
        <div data-testid="live-events-count">{liveEvents.length}</div>
        <div data-testid="upcoming-events-count">{upcomingEvents.length}</div>
        <div data-testid="past-events-count">{pastEvents.length}</div>
        {liveEvents.length > 0 && (
          <button onClick={() => openDeleteModal(liveEvents[0])}>
            Delete First Live Event
          </button>
        )}
        {upcomingEvents.length > 0 && (
          <button onClick={() => openAnalyticsModal(upcomingEvents[0])}>
            Analytics First Upcoming Event
          </button>
        )}
      </div>
    );
  };
});

jest.mock("@/components/dashboard/dashboardStats", () => {
  return function DashboardStats({ stats }) {
    return (
      <div data-testid="dashboard-stats">
        {stats.map((stat, idx) => (
          <div key={idx} data-testid={`stat-${idx}`}>
            {stat.label}: {stat.value}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("@/components/dashboard/dashboardQuickActions", () => {
  return function DashboardQuickActions({ quickActions }) {
    return (
      <div data-testid="quick-actions">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            data-testid={`action-${idx}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock("@/components/dashboard/vendorDashboard", () => {
  return function VendorsDashboard() {
    return <div data-testid="vendors-dashboard">Vendors Dashboard</div>;
  };
});

// Helper function to create a mock Redux store
const createMockStore = (userName = "John Doe") => {
  return configureStore({
    reducer: {
      auth: (state = { user: { name: userName } }) => state,
    },
  });
};

// Helper function to render component with Redux Provider
const renderWithRedux = (
  ui,
  { store = createMockStore(), ...options } = {}
) => {
  return render(<Provider store={store}>{ui}</Provider>, options);
};

describe("DashboardUI Component", () => {
  const mockOnLogout = jest.fn();
  const mockOnCreateEvent = jest.fn();
  const mockOpenDeleteModal = jest.fn();
  const mockOpenAnalyticsModal = jest.fn();
  const mockOnViewChange = jest.fn();

  const defaultProps = {
    isLoading: false,
    onLogout: mockOnLogout,
    onCreateEvent: mockOnCreateEvent,
    openDeleteModal: mockOpenDeleteModal,
    openAnalyticsModal: mockOpenAnalyticsModal,
    stats: [
      { label: "Total Events", value: 5 },
      { label: "Active Events", value: 2 },
    ],
    quickActions: [
      { label: "Create Event", onClick: mockOnCreateEvent },
      { label: "View Analytics", onClick: jest.fn() },
    ],
    filteredEvents: {
      liveEvents: [{ id: 1, name: "Live Event 1" }],
      upcomingEvents: [{ id: 2, name: "Upcoming Event 1" }],
      pastEvents: [{ id: 3, name: "Past Event 1" }],
    },
    activeView: "events",
    onViewChange: mockOnViewChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // LOADING STATE TESTS
  // ============================================================

  describe("Loading State", () => {
    it("should display loading state when isLoading is true", () => {
      const { container } = renderWithRedux(
        <DashboardUI {...defaultProps} isLoading={true} />
      );

      // Check for the loading message - it appears in both the header and loading component
      const loadingText = screen.getAllByText(/Loading your dashboard/i);
      expect(loadingText.length).toBeGreaterThan(0);

      expect(
        screen.getByText(/Setting up your dashboard/i)
      ).toBeInTheDocument();
    });

    it("should not display dashboard content when loading", () => {
      renderWithRedux(<DashboardUI {...defaultProps} isLoading={true} />);

      expect(screen.queryByTestId("dashboard-stats")).not.toBeInTheDocument();
      expect(screen.queryByTestId("quick-actions")).not.toBeInTheDocument();
      expect(screen.queryByTestId("my-events")).not.toBeInTheDocument();
    });

    it("should not display logout button when loading", () => {
      renderWithRedux(<DashboardUI {...defaultProps} isLoading={true} />);

      expect(
        screen.queryByRole("button", { name: /logout/i })
      ).not.toBeInTheDocument();
    });

    it("should not display Sparkles icon when loading", () => {
      const { container } = renderWithRedux(
        <DashboardUI {...defaultProps} isLoading={true} />
      );

      // Sparkles icon should not be present
      const sparklesIcon = container.querySelector(".animate-pulse");
      expect(sparklesIcon).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // USER NAME DISPLAY TESTS
  // ============================================================

  describe("User Name Display", () => {
    it("should display user name from Redux store", () => {
      const store = createMockStore("Alice Smith");
      renderWithRedux(<DashboardUI {...defaultProps} />, { store });

      expect(
        screen.getByText(/Welcome back, Alice Smith!/i)
      ).toBeInTheDocument();
    });

    it('should display "User" as fallback when userName is null', () => {
      const store = createMockStore(null);
      renderWithRedux(<DashboardUI {...defaultProps} />, { store });

      expect(screen.getByText(/Welcome back, User!/i)).toBeInTheDocument();
    });

    it('should display "User" as fallback when userName is undefined', () => {
      const store = configureStore({
        reducer: {
          auth: () => ({ user: {} }),
        },
      });
      renderWithRedux(<DashboardUI {...defaultProps} />, { store });

      expect(screen.getByText(/Welcome back, User!/i)).toBeInTheDocument();
    });

    it('should display "User" as fallback when user object is null', () => {
      const store = configureStore({
        reducer: {
          auth: () => ({ user: null }),
        },
      });
      renderWithRedux(<DashboardUI {...defaultProps} />, { store });

      expect(screen.getByText(/Welcome back, User!/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // ACTIVE VIEW TESTS
  // ============================================================

  describe("Active View Display", () => {
    it('should display events view description when activeView is "events"', () => {
      renderWithRedux(<DashboardUI {...defaultProps} activeView="events" />);

      expect(
        screen.getByText(
          /Manage your events, track performance, and grow your audience./i
        )
      ).toBeInTheDocument();
    });

    it('should display vendors view description when activeView is "vendors"', () => {
      renderWithRedux(<DashboardUI {...defaultProps} activeView="vendors" />);

      expect(
        screen.getByText(
          /Manage vendor verifications, contracts, and payments./i
        )
      ).toBeInTheDocument();
    });

    it('should display events content when activeView is "events"', () => {
      renderWithRedux(<DashboardUI {...defaultProps} activeView="events" />);

      expect(screen.getByTestId("my-events")).toBeInTheDocument();
      expect(screen.queryByTestId("vendors-dashboard")).not.toBeInTheDocument();
    });

    it('should display vendors content when activeView is "vendors"', () => {
      renderWithRedux(<DashboardUI {...defaultProps} activeView="vendors" />);

      expect(screen.getByTestId("vendors-dashboard")).toBeInTheDocument();
      expect(screen.queryByTestId("my-events")).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // STATS AND QUICK ACTIONS TESTS
  // ============================================================

  describe("Stats and Quick Actions", () => {
    it("should render dashboard stats with provided data", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const statsContainer = screen.getByTestId("dashboard-stats");
      expect(
        within(statsContainer).getByText(/Total Events: 5/i)
      ).toBeInTheDocument();
      expect(
        within(statsContainer).getByText(/Active Events: 2/i)
      ).toBeInTheDocument();
    });

    it("should render quick actions with provided data", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const quickActionsContainer = screen.getByTestId("quick-actions");
      expect(
        within(quickActionsContainer).getByText(/Create Event/i)
      ).toBeInTheDocument();
      expect(
        within(quickActionsContainer).getByText(/View Analytics/i)
      ).toBeInTheDocument();
    });

    it("should handle empty stats array", () => {
      renderWithRedux(<DashboardUI {...defaultProps} stats={[]} />);

      const statsContainer = screen.getByTestId("dashboard-stats");
      expect(statsContainer).toBeInTheDocument();
      expect(statsContainer.children.length).toBe(0);
    });

    it("should handle empty quickActions array", () => {
      renderWithRedux(<DashboardUI {...defaultProps} quickActions={[]} />);

      const quickActionsContainer = screen.getByTestId("quick-actions");
      expect(quickActionsContainer).toBeInTheDocument();
      expect(quickActionsContainer.children.length).toBe(0);
    });
  });

  // ============================================================
  // FILTERED EVENTS TESTS (Edge Cases)
  // ============================================================

  describe("Filtered Events Edge Cases", () => {
    it("should handle all event arrays being empty", () => {
      const emptyEvents = {
        liveEvents: [],
        upcomingEvents: [],
        pastEvents: [],
      };
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={emptyEvents} />
      );

      expect(screen.getByText(/0 events created/i)).toBeInTheDocument();
      expect(screen.getByTestId("live-events-count")).toHaveTextContent("0");
      expect(screen.getByTestId("upcoming-events-count")).toHaveTextContent(
        "0"
      );
      expect(screen.getByTestId("past-events-count")).toHaveTextContent("0");
    });

    it("should handle null filteredEvents prop", () => {
      renderWithRedux(<DashboardUI {...defaultProps} filteredEvents={null} />);

      expect(screen.getByText(/0 events created/i)).toBeInTheDocument();
      expect(screen.getByTestId("live-events-count")).toHaveTextContent("0");
    });

    it("should handle undefined filteredEvents prop", () => {
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={undefined} />
      );

      expect(screen.getByText(/0 events created/i)).toBeInTheDocument();
    });

    it("should handle missing liveEvents array", () => {
      const events = {
        upcomingEvents: [{ id: 1 }],
        pastEvents: [{ id: 2 }],
      };
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={events} />
      );

      expect(screen.getByText(/2 events created/i)).toBeInTheDocument();
    });

    it("should handle missing upcomingEvents array", () => {
      const events = {
        liveEvents: [{ id: 1 }],
        pastEvents: [{ id: 2 }],
      };
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={events} />
      );

      expect(screen.getByText(/2 events created/i)).toBeInTheDocument();
    });

    it("should handle missing pastEvents array", () => {
      const events = {
        liveEvents: [{ id: 1 }],
        upcomingEvents: [{ id: 2 }],
      };
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={events} />
      );

      expect(screen.getByText(/2 events created/i)).toBeInTheDocument();
    });

    it("should correctly calculate total with exactly 1 event", () => {
      const events = {
        liveEvents: [{ id: 1 }],
        upcomingEvents: [],
        pastEvents: [],
      };
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={events} />
      );

      expect(screen.getByText(/1 event created/i)).toBeInTheDocument();
    });

    it("should correctly calculate total with multiple events", () => {
      const events = {
        liveEvents: [{ id: 1 }, { id: 2 }],
        upcomingEvents: [{ id: 3 }],
        pastEvents: [{ id: 4 }, { id: 5 }],
      };
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={events} />
      );

      expect(screen.getByText(/5 events created/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // EVENT INTERACTION TESTS
  // ============================================================

  describe("Event Interactions", () => {
    it("should pass filtered events to MyEvents component", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      expect(screen.getByTestId("live-events-count")).toHaveTextContent("1");
      expect(screen.getByTestId("upcoming-events-count")).toHaveTextContent(
        "1"
      );
      expect(screen.getByTestId("past-events-count")).toHaveTextContent("1");
    });

    it("should call openDeleteModal when delete action is triggered", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const deleteButton = screen.getByRole("button", {
        name: /Delete First Live Event/i,
      });
      fireEvent.click(deleteButton);

      expect(mockOpenDeleteModal).toHaveBeenCalledTimes(1);
      expect(mockOpenDeleteModal).toHaveBeenCalledWith({
        id: 1,
        name: "Live Event 1",
      });
    });

    it("should call openAnalyticsModal when analytics action is triggered", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const analyticsButton = screen.getByRole("button", {
        name: /Analytics First Upcoming Event/i,
      });
      fireEvent.click(analyticsButton);

      expect(mockOpenAnalyticsModal).toHaveBeenCalledTimes(1);
      expect(mockOpenAnalyticsModal).toHaveBeenCalledWith({
        id: 2,
        name: "Upcoming Event 1",
      });
    });
  });

  // ============================================================
  // BUTTON VISIBILITY TESTS
  // ============================================================

  describe("Button Visibility and Actions", () => {
    it("should display logout button when onLogout is provided and not loading", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should not display logout button when onLogout is null", () => {
      renderWithRedux(<DashboardUI {...defaultProps} onLogout={null} />);

      expect(
        screen.queryByRole("button", { name: /logout/i })
      ).not.toBeInTheDocument();
    });

    it("should call onLogout when logout button is clicked", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('should display "New Event" button when totalEvents > 0', () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const newEventButton = screen.getByRole("button", { name: /New Event/i });
      expect(newEventButton).toBeInTheDocument();
    });

    it('should not display "New Event" button when totalEvents is 0', () => {
      const emptyEvents = {
        liveEvents: [],
        upcomingEvents: [],
        pastEvents: [],
      };
      renderWithRedux(
        <DashboardUI {...defaultProps} filteredEvents={emptyEvents} />
      );

      expect(
        screen.queryByRole("button", { name: /New Event/i })
      ).not.toBeInTheDocument();
    });

    it('should call onCreateEvent when "New Event" button is clicked', () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      const newEventButton = screen.getByRole("button", { name: /New Event/i });
      fireEvent.click(newEventButton);

      expect(mockOnCreateEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // TICKETS SECTION TESTS
  // ============================================================

  describe("Purchased Tickets Section", () => {
    it("should display tickets section in events view", () => {
      renderWithRedux(<DashboardUI {...defaultProps} activeView="events" />);

      expect(screen.getByText(/Your Tickets/i)).toBeInTheDocument();
      expect(screen.getByText(/Events you're attending/i)).toBeInTheDocument();
    });

    it("should not display tickets section in vendors view", () => {
      renderWithRedux(<DashboardUI {...defaultProps} activeView="vendors" />);

      expect(screen.queryByText(/Your Tickets/i)).not.toBeInTheDocument();
    });

    it("should display empty state for tickets", () => {
      renderWithRedux(<DashboardUI {...defaultProps} />);

      expect(screen.getByText(/No Tickets Yet/i)).toBeInTheDocument();
      expect(
        screen.getByText(/You haven't purchased any tickets yet./i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Explore Events/i })
      ).toBeInTheDocument();
    });
  });

  // ============================================================
  // PROP DEFAULTS TESTS
  // ============================================================

  describe("Prop Defaults", () => {
    it('should default activeView to "events" when not provided', () => {
      const propsWithoutActiveView = { ...defaultProps };
      delete propsWithoutActiveView.activeView;

      renderWithRedux(<DashboardUI {...propsWithoutActiveView} />);

      expect(screen.getByTestId("my-events")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Manage your events, track performance, and grow your audience./i
        )
      ).toBeInTheDocument();
    });
  });

  // ============================================================
  // COMPLEX INTEGRATION TESTS
  // ============================================================

  describe("Complex Integration Scenarios", () => {
    it("should handle complete workflow: load -> display -> interact", () => {
      const { rerender } = renderWithRedux(
        <DashboardUI {...defaultProps} isLoading={true} />
      );

      // Initially loading - the header will show "Loading your dashboard..."
     const loadingText = screen.getAllByText(/Loading your dashboard/i);
     expect(loadingText.length).toBeGreaterThan(0);

      // Finish loading
      rerender(
        <Provider store={createMockStore()}>
          <DashboardUI {...defaultProps} isLoading={false} />
        </Provider>
      );

      // Content should now be visible
      expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
      expect(screen.getByTestId("my-events")).toBeInTheDocument();

      // Interact with create event
      const newEventButton = screen.getByRole("button", { name: /New Event/i });
      fireEvent.click(newEventButton);
      expect(mockOnCreateEvent).toHaveBeenCalledTimes(1);
    });

    it("should handle view switching", () => {
      const { rerender } = renderWithRedux(
        <DashboardUI {...defaultProps} activeView="events" />
      );

      expect(screen.getByTestId("my-events")).toBeInTheDocument();
      expect(screen.queryByTestId("vendors-dashboard")).not.toBeInTheDocument();

      rerender(
        <Provider store={createMockStore()}>
          <DashboardUI {...defaultProps} activeView="vendors" />
        </Provider>
      );

      expect(screen.queryByTestId("my-events")).not.toBeInTheDocument();
      expect(screen.getByTestId("vendors-dashboard")).toBeInTheDocument();
    });
  });
});
