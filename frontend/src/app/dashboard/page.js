// frontend/src/app/dashboard/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

// Imports for Modals
import DeleteModal from "@/components/modal/delete";
import AnalyticsModal from "@/components/modal/analytics";

import DashboardUI from "@/components/dashboard/dashboardUI";
import { logoutUser } from "@/redux/action/actionAuth";
import { fetchUserEvents } from "@/redux/action/eventAction";
// TODO: Import fetchUserTickets when available
// import { fetchUserTickets } from "@/redux/action/ticketAction";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  // Redux state selectors (Assuming a structure like state.events exists for analytics)
  const {
    user,
    status: authStatus,
    isInitialized,
  } = useSelector((state) => state.auth);

  const { analyticsData, analyticsStatus } = useSelector(
    (state) => state.events
  ); // <-- ASSUMPTION: Event state has analytics

  // --- Local state for Content & Modals ---
  const [events, setEvents] = useState([]);
  const [purchasedTickets, setPurchasedTickets] = useState([]);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [isAuthValidated, setIsAuthValidated] = useState(false);
  const [error, setError] = useState(null);

  // Modal State for Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ id: null, title: "" });

  // Modal State for Analytics
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [analyticsTargetId, setAnalyticsTargetId] = useState(null);


  const openDeleteModal = useCallback((id, title) => {
    setDeleteTarget({ id, title });
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setDeleteTarget({ id: null, title: "" });
  }, []);


  const openAnalyticsModal = useCallback((id) => {
    setAnalyticsTargetId(id);
    setIsAnalyticsModalOpen(true);
  }, []);

  const closeAnalyticsModal = useCallback(() => {
    setIsAnalyticsModalOpen(false);
    setAnalyticsTargetId(null);
  }, []);

  /**
   * Effect to monitor analytics fetch and show the modal when data is ready
   */
  useEffect(() => {
    if (analyticsTargetId && analyticsStatus === "succeeded" && analyticsData) {
      // Find the specific event title for the modal
      const targetEvent = events.find((e) => e.id === analyticsTargetId);
      if (targetEvent) {
        console.log(`✅ Analytics ready for: ${targetEvent.eventTitle}`);
        setIsAnalyticsModalOpen(true);
      }
    }
    // Note: If status is 'failed', you might want to show an error toast here
  }, [analyticsStatus, analyticsTargetId, analyticsData, events]);

 
  const loadUserContent = useCallback(async () => {
    console.log("📊 Loading dashboard content...");
    setIsContentLoading(true);
    setError(null);

    try {
      // Fetch user's created events
      const eventsResult = await dispatch(fetchUserEvents());

      if (fetchUserEvents.fulfilled.match(eventsResult)) {
        const userEvents = eventsResult.payload || [];
        setEvents(userEvents);
        console.log("✅ Events loaded:", userEvents.length);
      } else {
        const errorMsg =
          eventsResult.payload?.message ||
          eventsResult.error?.message ||
          "Failed to fetch events";
        console.error("❌ Events fetch failed:", errorMsg);
        setEvents([]);
        setError(errorMsg);
      }

      setPurchasedTickets([]); // Placeholder until tickets endpoint is ready
    } catch (error) {
      console.error("❌ Unexpected error loading content:", error);
      setError("An unexpected error occurred");
      setEvents([]);
      setPurchasedTickets([]);
    } finally {
      setIsContentLoading(false);
    }
  }, [dispatch]);

  /**
   * Authentication & redirect logic
   */
  useEffect(() => {
    console.log("🔐 Auth Check:", {
      isInitialized,
      authStatus,
      hasUser: !!user,
    });

    // Wait for session initialization
    if (!isInitialized || authStatus === "loading") {
      setIsAuthValidated(false);
      return;
    }

    // Redirect unauthenticated users
    if (isInitialized && !user) {
      setIsContentLoading(false);
      setIsAuthValidated(false);
      router.push("/account/auth/login");
      return;
    }

    // User is authenticated - load content
    if (isInitialized && user && authStatus === "succeeded") {
      setIsAuthValidated(true);
      loadUserContent();
    }
  }, [isInitialized, authStatus, user, router, loadUserContent]);

  /**
   * Logout handler
   */
  const handleLogout = async () => {
    console.log("👋 Logging out...");

    try {
      await dispatch(logoutUser());
      console.log("✅ Logout successful. Redirecting...");
      router.push("/account/auth/login");
    } catch (error) {
      console.error("❌ Logout error:", error);
      router.push("/account/auth/login");
    }
  };

  /**
   * Navigate to create event page
   */
  const handleCreateEvent = () => {
    console.log("➕ Navigating to event creation...");
    router.push("/events/create-events");
  };

  /**
   * Comprehensive loading check
   */
  const isLoading =
    !isInitialized ||
    authStatus === "loading" ||
    !isAuthValidated ||
    (isAuthValidated && isContentLoading) ||
    !user;

  /**
   * Early return for loading state
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Loading Dashboard
          </h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  /**
   * Safety check before render
   */
  if (!user || !isAuthValidated) {
    console.error("🚨 CRITICAL: Reached render without proper auth!");
    return null;
  }

  /**
   * Error state display
   */
  if (error && events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadUserContent}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Find the event object corresponding to the currently viewed analytics
  const currentEvent = events.find((e) => e.id === analyticsTargetId);

  /**
   * Main render
   */
  return (
    <>
      <DashboardUI
        userName={user.name}
        isLoading={false}
        events={events}
        purchasedTickets={purchasedTickets}
        onLogout={handleLogout}
        onCreateEvent={handleCreateEvent}
        // 👇 PASS THE NEW HANDLERS DOWN TO THE UI/CARD COMPONENTS
        openDeleteModal={openDeleteModal}
        openAnalyticsModal={openAnalyticsModal}
      />

      {/* -------------------- MODALS -------------------- */}

      {/* 1. Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        eventId={deleteTarget.id}
        eventTitle={deleteTarget.title}
      />

      {/* 2. Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsModalOpen && !!currentEvent}
        onClose={closeAnalyticsModal}
        // Pass the fetched data from Redux
        analyticsData={analyticsData}
        eventTitle={
          currentEvent
            ? `${currentEvent.eventTitle} Sales Report`
            : "Sales Report"
        }
        isLoading={analyticsStatus === "pending"}
      />
    </>
  );
}
