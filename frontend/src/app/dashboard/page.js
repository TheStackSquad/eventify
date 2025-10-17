// frontend/src/app/dashboard/page.js

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

// Layout & Views
import DashboardLayout from "@/components/dashboard/dashboardLayout";
import MyEventsDashboard from "@/components/dashboard/myEventsDashboard";
import VendorsDashboard from "@/components/dashboard/vendorDashboard"; // Handles both Analytics and Registration

// Modals
import DeleteModal from "@/components/modal/delete";
import AnalyticsModal from "@/components/modal/analytics";

// Redux Actions
import { logoutUser } from "@/redux/action/actionAuth";
import { fetchUserEvents } from "@/redux/action/eventAction";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  // Redux state
  const {
    user,
    status: authStatus,
    isInitialized,
  } = useSelector((state) => state.auth);
  // console.log('Inside The Main Page:', user);

  const { analyticsData, analyticsStatus } = useSelector(
    (state) => state.events
  );

  // View state
  const [activeView, setActiveView] = useState("events");

  // Events data (only for MyEventsDashboard)
  const [events, setEvents] = useState([]);
  const [purchasedTickets, setPurchasedTickets] = useState([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isAuthValidated, setIsAuthValidated] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ id: null, title: "" });
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [analyticsTargetId, setAnalyticsTargetId] = useState(null);

  // Modal handlers
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

  // Analytics data ready check
  useEffect(() => {
    if (analyticsTargetId && analyticsStatus === "succeeded" && analyticsData) {
      const targetEvent = events.find((e) => e.id === analyticsTargetId);
      if (targetEvent) {
        console.log(`✅ Analytics ready for: ${targetEvent.eventTitle}`);
        setIsAnalyticsModalOpen(true);
      }
    }
  }, [analyticsStatus, analyticsTargetId, analyticsData, events]);

  // Load events data
  const loadUserEvents = useCallback(async () => {
    console.log("📊 Loading user events...");
    setIsEventsLoading(true);
    setError(null);

    try {
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

      // Placeholder for purchased tickets
      setPurchasedTickets([]);
    } catch (error) {
      console.error("❌ Unexpected error loading events:", error);
      setError("An unexpected error occurred");
      setEvents([]);
    } finally {
      setIsEventsLoading(false);
    }
  }, [dispatch]);

  // Authentication & redirect logic
  useEffect(() => {
    console.log("🔐 Auth Check:", {
      isInitialized,
      authStatus,
      hasUser: !!user,
    });

    if (!isInitialized || authStatus === "loading") {
      setIsAuthValidated(false);
      return;
    }

    if (isInitialized && !user) {
      setIsEventsLoading(false);
      setIsAuthValidated(false);
      router.push("/account/auth/login");
      return;
    }

    if (isInitialized && user && authStatus === "succeeded") {
      setIsAuthValidated(true);
      loadUserEvents();
    }
  }, [isInitialized, authStatus, user, router, loadUserEvents]);

  // Logout handler
  const handleLogout = async () => {
    console.log("👋 Logging out...");
    try {
      await dispatch(logoutUser());
      console.log("✅ Logout successful");
      router.push("/account/auth/login");
    } catch (error) {
      console.error("❌ Logout error:", error);
      router.push("/account/auth/login");
    }
  };

  // Navigate to create event
  const handleCreateEvent = () => {
    console.log("➕ Navigating to event creation...");
    router.push("/events/create-events");
  };

  // Loading check
  const isLoading =
    !isInitialized || authStatus === "loading" || !isAuthValidated || !user;

  // Loading state
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

  // Safety check
  if (!user || !isAuthValidated) {
    console.error("🚨 CRITICAL: Reached render without proper auth!");
    return null;
  }

  // Error state (only for events view)
  if (error && events.length === 0 && activeView === "events") {
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
            onClick={loadUserEvents}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentEvent = events.find((e) => e.id === analyticsTargetId);

  // Main render
  return (
    <>
      <DashboardLayout
        userName={user.name}
        activeView={activeView}
        onViewChange={setActiveView}
        onLogout={handleLogout}
      >
        {/* Conditional rendering based on active view */}
        {activeView === "events" && (
          <MyEventsDashboard
            events={events}
            purchasedTickets={purchasedTickets}
            isLoading={isEventsLoading}
            onCreateEvent={handleCreateEvent}
            openDeleteModal={openDeleteModal}
            openAnalyticsModal={openAnalyticsModal}
          />
        )}

        {/* --- MODIFIED VENDOR BLOCK --- */}
        {(activeView === "vendor" || activeView === "vendor-register") && (
          <VendorsDashboard activeView={activeView} />
        )}
        {/* ------------------------------ */}
      </DashboardLayout>

      {/* Modals */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        eventId={deleteTarget.id}
        eventTitle={deleteTarget.title}
      />

      <AnalyticsModal
        isOpen={isAnalyticsModalOpen && !!currentEvent}
        onClose={closeAnalyticsModal}
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
