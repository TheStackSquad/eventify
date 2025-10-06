//src/app/dashboard/page.js
"use client";

import { useState, useEffect } from "react";
import DashboardUI from "@/components/dashboard/dashboardUI";
import { useSelector } from "react-redux"; // Import useSelector

// Mock ticket data for demonstration purposes
const mockTickets = [
  {
    eventName: "Tech Summit 2025",
    date: new Date(Date.now() + 86400000).toISOString(),
    time: "10:00 AM",
    location: "Convention Center",
    quantity: 2,
    status: "upcoming",
    purchaseDate: "2025-09-01",
  },
  {
    eventName: "Music Fest Winter",
    date: new Date(Date.now() - 86400000).toISOString(),
    time: "07:00 PM",
    location: "Stadium Arena",
    quantity: 1,
    status: "past",
    purchaseDate: "2025-08-15",
  },
];

/**
 * Main dashboard page component.
 * It consumes the user session state from Redux and passes it to the UI component.
 */
export default function DashboardPage() {
  // 1. SELECT USER NAME AND AUTH STATUS FROM REDUX
  // Assumes the name is stored under state.auth.user.name
  const userName = useSelector((state) => state.auth.user?.name);
  // Assumes the status is stored under state.auth.status (e.g., 'loading', 'succeeded')
  const authStatus = useSelector((state) => state.auth.status);

  // 2. Local state for content loading simulation (1.5s delay after signin succeeds)
  const [isContentLoading, setIsContentLoading] = useState(true);

  useEffect(() => {
    // If the Redux authentication process (signinUser thunk) reports success:
    if (authStatus === "succeeded") {
      // Start a timer to simulate loading the dashboard's specific content (e.g., tickets)
      const timer = setTimeout(() => {
        setIsContentLoading(false);
      }, 1500); // 1.5 second loading delay

      return () => clearTimeout(timer);
    } else if (authStatus === "loading") {
      // If the signin process is still running, ensure loading is active
      setIsContentLoading(true);
    } else if (authStatus === "failed") {
      // If signin failed, stop the simulated loading
      setIsContentLoading(false);
    }
  }, [authStatus]); // Dependency array ensures this runs when Redux auth status changes

  // Combine Redux's immediate loading state ('loading') with the simulated content loading state
  const isLoading = authStatus === "loading" || isContentLoading;

  return (
    // Pass the Redux-derived user name and the combined loading state to the UI
    <DashboardUI
      userName={userName}
      isLoading={isLoading}
      tickets={mockTickets}
    />
  );
}
