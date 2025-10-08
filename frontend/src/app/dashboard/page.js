// frontend/src/app/dashboard/page.js

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

import DashboardUI from "@/components/dashboard/dashboardUI";
import { logoutUser } from "@/redux/action/actionAuth";

// Placeholder for the real API call to fetch user tickets
const fetchUserTickets = async () => {
  console.log("LOG: Initiating API call to fetch user tickets...");
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [];
};

export default function DashboardPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  // 1. SELECT AUTH STATE AND USER DATA
  const {
    user,
    status: authStatus,
    isInitialized,
  } = useSelector((state) => state.auth);

  const userName = user?.name;

  // 2. STATE FOR CONTENT AND LOADING
  const [tickets, setTickets] = useState([]);
  const [isContentLoading, setIsContentLoading] = useState(true);

  // 3. NEW: Explicit flag to confirm we've validated auth successfully
  const [isAuthValidated, setIsAuthValidated] = useState(false);

  // 4. LOGIC FOR FETCHING TICKETS
  const loadUserContent = useCallback(async () => {
    console.log("LOG: Starting content fetch (Tickets)...");

    try {
      const userTickets = await fetchUserTickets();
      setTickets(userTickets);
      console.log(
        "LOG: Tickets fetched successfully. Count:",
        userTickets.length
      );
    } catch (error) {
      console.error("LOG: Failed to fetch tickets:", error);
      setTickets([]);
    } finally {
      setIsContentLoading(false);
    }
  }, []);

  // 5. CORE AUTH & REDIRECT LOGIC
  useEffect(() => {
    console.log(
      `LOG: Dashboard Effect: isInitialized=${isInitialized}, authStatus=${authStatus}, userExists=${!!user}`
    );

    // A. Initial check is not complete (Redux is still loading the session)
    if (!isInitialized || authStatus === "loading") {
      console.log("LOG: Waiting for session initialization...");
      setIsAuthValidated(false); // Explicitly mark auth as not validated
      return;
    }

    // B. Handle UNAUTHENTICATED State
    if (isInitialized && !user) {
      console.log(
        "LOG: Initialization complete, but no authenticated user found. Redirecting to /login."
      );
      setIsContentLoading(false);
      setIsAuthValidated(false);
      router.push("/account/auth/login");
      return;
    }

    // C. Handle Successful Initialization (User is authenticated)
    if (isInitialized && user && authStatus === "succeeded") {
      console.log("LOG: User is authenticated. Marking auth as validated.");
      setIsAuthValidated(true); // Mark auth as successfully validated
      loadUserContent();
    }
  }, [isInitialized, authStatus, router, loadUserContent, user]);

  // 6. TRIPLE-LAYER LOADING CHECK
  // Show loading if ANY of these conditions are true:
  const isLoading =
    !isInitialized || // Redux hasn't initialized
    authStatus === "loading" || // Auth is actively checking
    !isAuthValidated || // We haven't confirmed auth success
    (isAuthValidated && isContentLoading) || // Auth passed but content still loading
    !user; // No user object (redundant but defensive)

  // 7. LOGOUT HANDLER FUNCTION
  const handleLogout = async () => {
    console.log("LOG: User initiated logout.");
    const resultAction = await dispatch(logoutUser());

    if (
      logoutUser.fulfilled.match(resultAction) ||
      logoutUser.rejected.match(resultAction)
    ) {
      console.log("LOG: Logout finished. Redirecting to /login.");
      router.push("/account/auth/login");
    }
  };

  // 8. CREATE EVENT HANDLER
  const handleCreateEvent = () => {
    console.log("LOG: Redirecting user to Event Creation flow.");
    router.push("/events/create-events");
  };

  // 9. ULTRA-DEFENSIVE RENDER LOGIC
  // Early return for ANY loading state - no UI leakage possible
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Additional safety check: If somehow we get here without a user, show nothing
  if (!user || !isAuthValidated) {
    console.error("CRITICAL: Reached render without proper auth validation!");
    return null;
  }

  // Only render dashboard when ALL conditions are met:
  // ✓ isInitialized = true
  // ✓ user exists
  // ✓ authStatus = 'succeeded'
  // ✓ isAuthValidated = true
  // ✓ isContentLoading = false
  return (
    <DashboardUI
      userName={userName}
      isLoading={false}
      tickets={tickets}
      onLogout={handleLogout}
      onCreateEvent={handleCreateEvent}
    />
  );
}
