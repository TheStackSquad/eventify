// frontend/src/app/dashboard/page.js

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

import DashboardUI from "@/components/dashboard/dashboardUI";
import { logoutUser } from "@/redux/action/actionAuth";
import { fetchUserEvents } from "@/redux/action/eventAction"; // Import action

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
  // Renamed state from 'tickets' to 'events' to match fetched data
  const [events, setEvents] = useState([]);
  const [isContentLoading, setIsContentLoading] = useState(true);

  // 3. Explicit flag to confirm we've validated auth successfully
  const [isAuthValidated, setIsAuthValidated] = useState(false);

  // 4. LOGIC FOR FETCHING EVENTS
  const loadUserContent = useCallback(async () => {
    console.log("LOG: Starting content fetch (Events)...");
    setIsContentLoading(true);

    try {
      const resultAction = await dispatch(fetchUserEvents());

      if (fetchUserEvents.fulfilled.match(resultAction)) {
        const userEvents = resultAction.payload;
        setEvents(userEvents); // Update the 'events' state
        console.log(
          "LOG: Events fetched successfully. Count:",
          userEvents.length
        );
      } else {
        const error = resultAction.payload || resultAction.error;
        console.error("LOG: Failed to fetch events:", error.message);
        setEvents([]);
      }
    } catch (error) {
      console.error("LOG: Dispatch or unexpected error:", error);
      setEvents([]);
    } finally {
      setIsContentLoading(false);
    }
  }, [dispatch]);

  // 5. CORE AUTH & REDIRECT LOGIC
  useEffect(() => {
    console.log(
      `LOG: Dashboard Effect: isInitialized=${isInitialized}, authStatus=${authStatus}, userExists=${!!user}`
    );

    // A. Wait for Redux session initialization
    if (!isInitialized || authStatus === "loading") {
      console.log("LOG: Waiting for session initialization...");
      setIsAuthValidated(false);
      return;
    }

    // B. Handle UNAUTHENTICATED State
    if (isInitialized && !user) {
      console.log("LOG: No authenticated user found. Redirecting to /login.");
      setIsContentLoading(false);
      setIsAuthValidated(false);
      router.push("/account/auth/login");
      return;
    }

    // C. Handle Successful Initialization (User is authenticated)
    if (isInitialized && user && authStatus === "succeeded") {
      console.log("LOG: User is authenticated. Marking auth as validated.");
      setIsAuthValidated(true);
      loadUserContent();
    }
  }, [isInitialized, authStatus, router, loadUserContent, user]);

  // 6. TRIPLE-LAYER LOADING CHECK
  const isLoading =
    !isInitialized ||
    authStatus === "loading" ||
    !isAuthValidated ||
    (isAuthValidated && isContentLoading) ||
    !user;

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
  // Early return for ANY loading state
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

  // Safety check: If somehow we get here without a user, show nothing
  if (!user || !isAuthValidated) {
    console.error("CRITICAL: Reached render without proper auth validation!");
    return null;
  }

  // 10. SUCCESSFUL RENDER
  // Renders DashboardUI with the fetched 'events' data
  return (
    <DashboardUI
      userName={userName}
      isLoading={false}
      // Pass the fetched events data to the UI component
      events={events}
      onLogout={handleLogout}
      onCreateEvent={handleCreateEvent}
    />
  );
}
