//frontend/src/components/events/eventsUI.test.js

import { render, screen } from "@testing-library/react";
import EventsUI from "../events/eventsUI";
import "@testing-library/jest-dom";

// Mock the child component EventCard to isolate the EventsUI component logic
jest.mock("@/components/events/eventsCard", () => {
  // Use a functional component mock to easily identify rendered instances
  return function MockEventCard({ event }) {
    // We add a test ID that incorporates the event ID for verification
    return <div data-testid={`mock-event-card-${event.id}`}>{event.title}</div>;
  };
});

describe("EventsUI", () => {
  // Mock data for testing the non-empty state
  const mockEvents = [
    { id: "e1", title: "Tech Conference 2024", date: "2024-10-25" },
    { id: "e2", title: "React Workshop", date: "2024-11-01" },
    { id: "e3", title: "Gaming Tournament", date: "2024-11-15" },
  ];

  it('renders "No Events Found" message when the events array is empty', () => {
    // Arrange: Pass an empty array
    render(<EventsUI events={[]} />);

    // Act & Assert: Check for the specific header and descriptive paragraph
    expect(
      screen.getByRole("heading", { name: /No Events Found/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Try adjusting your search query or clearing some filters/i
      )
    ).toBeInTheDocument();

    // Assert that no event cards are rendered (by looking for a specific data-testid pattern)
    expect(screen.queryAllByTestId(/mock-event-card-/i)).toHaveLength(0);
  });

  it("renders the correct number of EventCard components when events are present", () => {
    // Arrange: Pass the mockEvents array
    render(<EventsUI events={mockEvents} />);

    // Act & Assert: Check if the mock EventCard components are rendered
    const renderedCards = screen.getAllByTestId(/mock-event-card-/i);
    expect(renderedCards).toHaveLength(mockEvents.length);

    // Further assert that each expected title is present
    expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
    expect(screen.getByText("React Workshop")).toBeInTheDocument();
    expect(screen.getByText("Gaming Tournament")).toBeInTheDocument();
  });

  it("passes the correct event prop to each EventCard component", () => {
    // This test relies on the mock implementation showing the title inside the data-testid container
    render(<EventsUI events={mockEvents} />);

    // Check if the component rendered for the first event uses the correct ID
    expect(screen.getByTestId("mock-event-card-e1")).toBeInTheDocument();
    // Check if the component rendered for the second event uses the correct ID
    expect(screen.getByTestId("mock-event-card-e2")).toBeInTheDocument();
    // Check if the component rendered for the third event uses the correct ID
    expect(screen.getByTestId("mock-event-card-e3")).toBeInTheDocument();
  });
});