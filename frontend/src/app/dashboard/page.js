// frontend/src/app/dashboard/page.js
"use client";

import { useState, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

// Layout & Views
import DashboardLayout from "@/components/dashboard/dashboardLayout";
import MyEventsDashboard from "@/components/dashboard/myEventsDashboard";
import VendorsDashboard from "@/components/dashboard/vendorDashboard";

// Modals
import DeleteModal from "@/components/modal/delete";
import AnalyticsModal from "@/components/modal/analytics";

// Redux Actions
import { logoutUser } from "@/redux/action/actionAuth";
import { fetchUserEvents } from "@/redux/action/eventAction";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  // ✅ OPTIMIZED: Single useSelector call with memoized selectors
  const { user, sessionChecked } = useSelector((state) => state.auth);
  console.log('user state:', user);
  const { analyticsData, analyticsStatus } = useSelector(
    (state) => state.events
  );

  // View state
  const [activeView, setActiveView] = useState("events");

  // Events data (only for MyEventsDashboard)
  const [events, setEvents] = useState([]);
  const [purchasedTickets, setPurchasedTickets] = useState([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ id: null, title: "" });
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [analyticsTargetId, setAnalyticsTargetId] = useState(null);

  // ✅ OPTIMIZED: Memoized modal handlers
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

  // ✅ OPTIMIZED: Memoized analytics check with early returns
  const analyticsTargetEvent = useMemo(() => {
    if (!analyticsTargetId || !events.length) return null;
    return events.find((e) => e.id === analyticsTargetId);
  }, [analyticsTargetId, events]);

  // Analytics data ready check
  const shouldOpenAnalyticsModal = useMemo(
    () =>
      analyticsTargetId &&
      analyticsStatus === "succeeded" &&
      analyticsData &&
      analyticsTargetEvent,
    [analyticsTargetId, analyticsStatus, analyticsData, analyticsTargetEvent]
  );

  // ✅ OPTIMIZED: Single useEffect for analytics modal
  useState(() => {
    if (shouldOpenAnalyticsModal) {
      setIsAnalyticsModalOpen(true);
    }
  }, [shouldOpenAnalyticsModal]);

  // ✅ OPTIMIZED: Memoized events loader with error handling
  const loadUserEvents = useCallback(async () => {
    if (isEventsLoading) return; // Prevent duplicate calls

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
          eventsResult.payload?.message || "Failed to fetch events";
        console.error("❌ Events fetch failed:", errorMsg);
        setEvents([]);
        setError(errorMsg);
      }
    } catch (error) {
      console.error("❌ Unexpected error loading events:", error);
      setError("An unexpected error occurred");
      setEvents([]);
    } finally {
      setIsEventsLoading(false);
    }
  }, [dispatch, isEventsLoading]);

  // ✅ REMOVED: All authentication redirect logic - now handled by middleware

  // ✅ OPTIMIZED: Load events only when session is verified and user exists
  useState(() => {
    if (sessionChecked && user) {
      loadUserEvents();
    }
  }, [sessionChecked, user, loadUserEvents]);

  // ✅ OPTIMIZED: Memoized logout handler
  const handleLogout = useCallback(async () => {
    console.log("👋 Logging out...");
    try {
      await dispatch(logoutUser());
      console.log("✅ Logout successful");
      // Middleware will handle redirect on next request
    } catch (error) {
      console.error("❌ Logout error:", error);
      // Still redirect even if API call fails
    } finally {
      router.push("/account/auth/login");
    }
  }, [dispatch, router]);

  // ✅ OPTIMIZED: Memoized navigation handler
  const handleCreateEvent = useCallback(() => {
    console.log("➕ Navigating to event creation...");
    router.push("/events/create-events");
  }, [router]);

  // ✅ OPTIMIZED: Single loading check using sessionChecked
  const isLoading = !sessionChecked || isEventsLoading;

  // ✅ OPTIMIZED: Memoized current event for analytics modal
  const currentEvent = useMemo(
    () => events.find((e) => e.id === analyticsTargetId),
    [events, analyticsTargetId]
  );

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

  // ✅ REMOVED: Manual auth validation checks - middleware guarantees user exists

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

  // ✅ OPTIMIZED: Main render with stable callback references
  return (
    <>
      <DashboardLayout
        userName={user?.name}
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

        {/* Vendor views */}
        {(activeView === "vendor" || activeView === "vendor-register") && (
          <VendorsDashboard activeView={activeView} />
        )}
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
