//frontend/src/components/events/eventSearch.test.js

import { render, screen } from "@testing-library/react";
import EventCard from "../events/eventSearch";
import "@testing-library/jest-dom";

// Mock the framer-motion library as its animation logic is outside the scope of unit testing
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children }) => <div>{children}</div>,
  },
}));

// Mock event data for various test cases
const mockPaidEvent = {
  title: "Global Tech Summit",
  category: "Technology",
  price: 1500000.0,
  date: "2025-01-20",
  time: "10:00 AM",
  location: "Lagos Expo Center",
  image: "https://example.com/tech.jpg",
  tag: "Trending",
};

const mockFreeEvent = {
  ...mockPaidEvent,
  title: "Free Web Dev Workshop",
  price: 0.0,
  tag: "Free Ticket",
};

const mockNewEvent = {
  ...mockPaidEvent,
  title: "Startup Pitch Day",
  price: 5000.0,
  tag: "New",
};

describe("EventCard", () => {
  // --- Defensive Check Tests ---

  it("renders null if the event prop is undefined", () => {
    const { container } = render(<EventCard event={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null if event prop is provided but price is missing", () => {
    // Missing the 'price' field which is required for the initial check
    const invalidEvent = { title: "Missing Price" };
    const { container } = render(<EventCard event={invalidEvent} />);
    expect(container.firstChild).toBeNull();
  });

  // --- Price Display Tests ---

  it("renders the price correctly with Naira sign and formatting for a paid event", () => {
    render(<EventCard event={mockPaidEvent} />);

    // Expected format: ₦1,500,000 (using toLocaleString)
    expect(screen.getByText("₦1,500,000")).toBeInTheDocument();
    expect(screen.queryByText("FREE")).not.toBeInTheDocument();
  });

  it('renders "FREE" text when the event price is 0.0', () => {
    render(<EventCard event={mockFreeEvent} />);

    expect(screen.getByText("FREE")).toBeInTheDocument();
    // Check for the price format to ensure it's not showing ₦0
    expect(screen.queryByText("₦0")).not.toBeInTheDocument();
  });

  // --- Content and Tag Tests ---

  it("renders all key event details", () => {
    render(<EventCard event={mockPaidEvent} />);

    // Check title and category
    expect(
      screen.getByRole("heading", { name: mockPaidEvent.title })
    ).toBeInTheDocument();
    expect(screen.getByText(mockPaidEvent.category)).toBeInTheDocument();

    // Check date, time, and location
    expect(screen.getByText(mockPaidEvent.date)).toBeInTheDocument();
    expect(screen.getByText(mockPaidEvent.time)).toBeInTheDocument();
    expect(screen.getByText(mockPaidEvent.location)).toBeInTheDocument();

    // Check action button
    expect(
      screen.getByRole("button", { name: /Find Tickets/i })
    ).toBeInTheDocument();
  });

  it('applies the correct Tailwind classes for the "Trending" tag', () => {
    render(<EventCard event={mockPaidEvent} />);

    const tagElement = screen.getByText("Trending");
    // Check for the specific classes defined in tagColors for 'Trending'
    expect(tagElement).toHaveClass("bg-yellow-100 text-yellow-800");
  });

  it('applies the correct Tailwind classes for the "New" tag', () => {
    render(<EventCard event={mockNewEvent} />);

    const tagElement = screen.getByText("New");
    // Check for the specific classes defined in tagColors for 'New'
    expect(tagElement).toHaveClass("bg-green-100 text-green-800");
  });

  it('applies the correct Tailwind classes for the "Free Ticket" tag', () => {
    render(<EventCard event={mockFreeEvent} />);

    const tagElement = screen.getByText("Free Ticket");
    // Check for the specific classes defined in tagColors for 'Free Ticket'
    expect(tagElement).toHaveClass("bg-blue-100 text-blue-800");
  });
});