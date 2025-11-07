// src/app/page.test.js
import { render, screen } from "@testing-library/react";
import { useDispatch } from "react-redux";
import Home from "./page"; // ← Change this! Use relative import for the component being tested

// Mock the dependencies
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));

jest.mock("@/components/homepage/hero", () => {
  return function MockHero() {
    return <div data-testid="hero-component">Hero Component</div>;
  };
});

jest.mock("@/components/homepage/ticketCard", () => {
  return function MockTicketCard() {
    return <div data-testid="ticket-card-component">TicketCard Component</div>;
  };
});

jest.mock("@/redux/action/eventAction", () => ({
  fetchAllEvents: jest.fn(),
}));

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  abort: jest.fn(),
  signal: { aborted: false },
}));

describe("Home Component", () => {
  let mockDispatch;

  beforeEach(() => {
    mockDispatch = jest.fn();
    useDispatch.mockReturnValue(mockDispatch);
    jest.clearAllMocks();
  });

  test("renders main page components", () => {
    render(<Home />);

    expect(screen.getByTestId("hero-component")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-card-component")).toBeInTheDocument();
  });

  test("dispatches fetchAllEvents on component mount", () => {
    const { fetchAllEvents } = require("@/redux/action/eventAction");

    render(<Home />);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(fetchAllEvents).toHaveBeenCalledWith(
      expect.objectContaining({ aborted: false })
    );
  });

  test("aborts fetch request on component unmount", () => {
    const mockAbort = jest.fn();
    global.AbortController.mockImplementation(() => ({
      abort: mockAbort,
      signal: { aborted: false },
    }));

    const { unmount } = render(<Home />);
    unmount();

    expect(mockAbort).toHaveBeenCalledTimes(1);
  });

  test("has correct layout structure", () => {
    render(<Home />);

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass("min-h-screen", "bg-black");
  });
});

describe("Home Component Edge Cases", () => {
  test("handles dispatch error gracefully", () => {
    const mockDispatchWithError = jest.fn(() => {
      throw new Error("Dispatch error");
    });
    useDispatch.mockReturnValue(mockDispatchWithError);

    expect(() => render(<Home />)).toThrow();
  });
});
