//src/app/dashboard/page.js

"use client";

import { useState, useEffect } from "react";
import DashboardUI from "@/components/dashboard/dashboardUI";

// --- Mock User Session Hook ---
// Replace this function entirely with your actual authentication hook
// (e.g., useUser, useSession, etc.) that fetches the logged-in user's data.
const useUserSession = () => {
  const [userName, setUserName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call delay
    const fetchUserData = () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // --- CHANGE THIS LINE FOR TESTING ---
          // Set to a first name (e.g., "Alex") to simulate logged-in user
          // Set to null to simulate "Welcome User" placeholder
          const loggedInUserFirstName = "Jane"; // Change "Jane" to null to test the placeholder

          resolve(loggedInUserFirstName);
        }, 1500); // 1.5 second loading delay
      });
    };

    fetchUserData().then((name) => {
      setUserName(name);
      setIsLoading(false);
    });
  }, []);

  return { userName, isLoading };
};
// ------------------------------------------

/**
 * Main dashboard page component.
 * It manages the user session state and passes it to the UI component.
 */
export default function DashboardPage() {
  // Use the mock hook to simulate authentication and data fetching
  const { userName, isLoading } = useUserSession();

  return (
    // The DashboardUI component handles rendering the loading state and the content.
    <DashboardUI userName={userName} isLoading={isLoading} />
  );
}
