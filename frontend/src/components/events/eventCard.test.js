// // frontend/src/components/events/eventsCard.test.js
// import React from "react";
// import { render, screen, fireEvent } from "@testing-library/react";
// import { Provider } from "react-redux";
// import { configureStore } from "@reduxjs/toolkit";
// import "@testing-library/jest-dom";
// import EventCard from "./eventsCard";

// // Mock framer-motion
// jest.mock("framer-motion", () => ({
//   motion: {
//     div: ({ children, initial, animate, transition, ...props }) => (
//       <div {...props}>{children}</div>
//     ),
//   },
// }));

// // Mock Next.js components
// jest.mock("next/image", () => ({
//   __esModule: true,
//   // The 'image' is NOT used as a local variable here, preventing conflict
//   default: ({ src, alt, fill, sizes, className, onError }) => (
//     <img src={src} alt={alt} className={className} data-testid="event-image" />
//   ),
// }));

// jest.mock("next/link", () => {
//   return ({ children, href, ...props }) => (
//     <a href={href} {...props}>
//       {children}
//     </a>
//   );
// });

// // Mock lucide-react icons
// jest.mock("lucide-react", () => ({
//   MapPin: () => <span data-testid="map-pin-icon">📍</span>,
//   Calendar: () => <span data-testid="calendar-icon">📅</span>,
//   Clock: () => <span data-testid="clock-icon">⏰</span>,
//   Heart: ({ fill, strokeWidth, className }) => (
//     <span
//       data-testid="heart-icon"
//       data-fill={fill}
//       data-stroke-width={strokeWidth}
//       className={className}
//     >
//       ❤️
//     </span>
//   ),
// }));

// // Mock Redux actions
// jest.mock("@/redux/action/likeAction", () => ({
//   toggleLikeOptimistic: jest.fn(() => ({ type: "TOGGLE_LIKE_OPTIMISTIC" })),
//   toggleEventLike: jest.fn(() => ({ type: "TOGGLE_EVENT_LIKE" })),
// }));

// import {
//   toggleLikeOptimistic,
//   toggleEventLike,
// } from "@/redux/action/likeAction";

// // Create mock store
// const createMockStore = () =>
//   configureStore({
//     reducer: {
//       auth: () => ({}),
//     },
//   });

// describe("EventCard", () => {
//   const mockEvent = {
//     id: "event-123",
//     title: "Summer Music Festival",
//     image: "/img/festival.jpg",
//     price: 5000,
//     isFree: false,
//     category: "Music",
//     date: "2024-07-15",
//     time: "18:00",
//     location: "Central Park, Lagos",
//     tag: "Trending",
//     isLikedByUser: false,
//     likeCount: 150,
//   };

//   const mockFreeEvent = {
//     ...mockEvent,
//     id: "event-456",
//     price: 0,
//     isFree: true,
//     tag: "Free Ticket",
//   };

//   const mockEventWithoutTag = {
//     ...mockEvent,
//     id: "event-789",
//     tag: undefined,
//   };

//   const renderWithStore = (event = mockEvent) => {
//     const store = createMockStore();
//     return render(
//       <Provider store={store}>
//         <EventCard event={event} />
//       </Provider>
//     );
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe("Rendering", () => {
//     it("renders event card with all details", () => {
//       renderWithStore();

//       // Check main content - FIXED: Use the exact text that's rendered
//       expect(screen.getByText("Summer Music Festival")).toBeInTheDocument();
//       expect(screen.getByText("Music")).toBeInTheDocument(); // Exact text match
//       expect(screen.getByText("₦5,000")).toBeInTheDocument();
//       expect(screen.getByText("Trending")).toBeInTheDocument();

//       // Check event details
//       expect(screen.getByText("2024-07-15")).toBeInTheDocument();
//       expect(screen.getByText("18:00")).toBeInTheDocument();
//       expect(screen.getByText("Central Park, Lagos")).toBeInTheDocument();

//       // Check buttons and links
//       expect(screen.getByText("Find Tickets")).toBeInTheDocument();
//       expect(screen.getByText("150")).toBeInTheDocument(); // like count
//     });
//   });

//   describe("Like Functionality", () => {
//     it("calls like actions when like button is clicked", () => {
//       renderWithStore();

//       const likeButton = screen.getByTestId("heart-icon").closest("button");
//       fireEvent.click(likeButton);

//       expect(toggleLikeOptimistic).toHaveBeenCalledWith("event-123");
//       expect(toggleEventLike).toHaveBeenCalledWith("event-123");
//     });

//     it("stops event propagation when like button is clicked", () => {
//       renderWithStore();

//       const likeButton = screen.getByTestId("heart-icon").closest("button");
//       const clickEvent = new MouseEvent("click", { bubbles: true });
//       const stopPropagationSpy = jest.spyOn(clickEvent, "stopPropagation");

//       fireEvent(likeButton, clickEvent);

//       expect(stopPropagationSpy).toHaveBeenCalled();
//     });

//     // DISPLAYS CORRECT LIKE COUNT
//     it("displays correct like count", () => {
//       const eventWithLikes = { ...mockEvent, likeCount: 2500 };
//       renderWithStore(eventWithLikes);

//       // Assumes the component formats numbers with toLocaleString
//       expect(screen.getByText("2,500")).toBeInTheDocument();
//     });
//   });

//   describe("Navigation", () => {
//     // RENDERS CORRECT LINK FOR EVENT DETAILS
//     it("renders correct link for event details", () => {
//       renderWithStore();

//       const ticketLink = screen.getByText("Find Tickets");
//       expect(ticketLink).toHaveAttribute("href", "/events/event-123");
//     });
//   });

//   describe("Edge Cases", () => {
//     it("returns null when event is undefined", () => {
//       // Test the component directly without the store wrapper
//       const { container } = render(<EventCard event={undefined} />);

//       // The component should return null for undefined event
//       expect(container.firstChild).toBeNull();
//     });

//     it("returns null when event price is undefined", () => {
//       const invalidEvent = { ...mockEvent, price: undefined };
//       const { container } = render(<EventCard event={invalidEvent} />);
//       expect(container.firstChild).toBeNull();
//     });

//     // HANDLES MISSING LIKE COUNT GRACEFULLY
//     it("handles missing like count gracefully", () => {
//       const eventWithoutLikes = { ...mockEvent, likeCount: undefined };
//       renderWithStore(eventWithoutLikes);

//       // Should show 0 likes
//       expect(screen.getByText("0")).toBeInTheDocument();
//     });

//     it("handles missing isLikedByUser gracefully", () => {
//       const eventWithoutLikeStatus = { ...mockEvent, isLikedByUser: undefined };
//       renderWithStore(eventWithoutLikeStatus);

//       // Should not be favorited by default
//       const heartIcon = screen.getByTestId("heart-icon");
//       expect(heartIcon).toHaveAttribute("data-fill", "none");
//     });
//   });

//   describe("Tag Colors", () => {
//     it("applies correct color classes for different tags", () => {
//       const eventsWithDifferentTags = [
//         { ...mockEvent, tag: "Trending" },
//         { ...mockEvent, tag: "Almost Sold Out" },
//         { ...mockEvent, tag: "New" },
//         { ...mockEvent, tag: "Free Ticket" },
//         { ...mockEvent, tag: "Unknown Tag" },
//       ];

//       eventsWithDifferentTags.forEach((event) => {
//         const { unmount } = renderWithStore(event);

//         const tagElement = screen.getByText(event.tag);
//         expect(tagElement).toBeInTheDocument();

//         unmount();
//       });
//     });
//   });

//   describe("Accessibility", () => {
//     // HAS PROPER IMAGE ALT TEXT
//     it("has proper image alt text", () => {
//       renderWithStore();

//       const image = screen.getByTestId("event-image");
//       expect(image).toHaveAttribute("alt", "Summer Music Festival");
//     });

//     it("has proper link text for screen readers", () => {
//       renderWithStore();

//       const ticketLink = screen.getByText("Find Tickets");
//       expect(ticketLink).toBeInTheDocument();
//     });

//     it("has interactive elements properly labeled", () => {
//       renderWithStore();

//       const likeButton = screen.getByTestId("heart-icon").closest("button");
//       expect(likeButton).toBeInTheDocument();
//     });
//   });

//   describe("Price Formatting", () => {
//     // FORMATS PRICE WITH THOUSAND SEPARATORS
//     it("formats price with thousand separators", () => {
//       const expensiveEvent = { ...mockEvent, price: 150000 };
//       renderWithStore(expensiveEvent);

//       expect(screen.getByText("₦150,000")).toBeInTheDocument();
//     });

//     it("shows FREE for free events", () => {
//       renderWithStore(mockFreeEvent);

//       expect(screen.getByText("FREE")).toBeInTheDocument();
//       expect(screen.queryByText("₦0")).not.toBeInTheDocument();
//     });
//   });
// });
