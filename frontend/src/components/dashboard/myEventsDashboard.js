// frontend/src/components/dashboard/MyEventsDashboard.js
"use client";

import { useMemo, useState } from "react";
// FIX: Corrected the import path from alias "@/components/dashboard/dashboardUI"
// to the relative path of the sibling component.
import DashboardUI from "./dashboardUI";
import {
  Plus,
  Users,
  DollarSign,
  Activity,
  Settings,
  BarChart3,
} from "lucide-react";

/**
 * MyEventsDashboard is the main Container Component for the dashboard view.
 * It's responsible for calculating stats, defining actions (like redirects),
 * and structuring the data before passing it to the presentation layer (DashboardUI).
 */
export default function MyEventsDashboard({
  events, // The raw list of events from the parent data layer
  isLoading,
  onCreateEvent, // This prop holds the redirect logic from the main page/data component
  openDeleteModal,
  openAnalyticsModal,
  purchasedTickets,
  userName,
  onLogout,
}) {
  const [activeView, setActiveView] = useState("events"); // Local state for view toggle

  // --- 1. DATA CALCULATION ---

  // Memoize event filtering
  const filteredEvents = useMemo(() => {
    // NOTE: Replace this mock/simple filtering with real logic if needed
    const now = new Date();

    const liveEvents = (events || []).filter(
      (e) => new Date(e.startDate) <= now && new Date(e.endDate) >= now
    );
    const upcomingEvents = (events || []).filter(
      (e) => new Date(e.startDate) > now
    );
    const pastEvents = (events || []).filter((e) => new Date(e.endDate) < now);

    return { liveEvents, upcomingEvents, pastEvents };
  }, [events]);

  // Memoize dashboard stats calculation
  const stats = useMemo(() => {
    const totalEvents = (events || []).length;
    // Mock values for a complete rendering
    const mockRevenue = totalEvents * 1500;
    const mockAttendees = totalEvents * 250;

    return [
      {
        label: "Total Events",
        value: totalEvents,
        icon: Activity,
        color: "bg-indigo-50 text-indigo-600",
      },
      {
        label: "Total Revenue (Mock)",
        value: `$${mockRevenue.toLocaleString()}`,
        icon: DollarSign,
        color: "bg-green-50 text-green-600",
      },
      {
        label: "Total Attendees (Mock)",
        value: mockAttendees.toLocaleString(),
        icon: Users,
        color: "bg-orange-50 text-orange-600",
      },
      {
        label: "Avg. Engagement",
        value: "85%",
        icon: BarChart3,
        color: "bg-purple-50 text-purple-600",
      },
    ];
  }, [events]);

  // --- 2. QUICK ACTIONS DEFINITION (FIXES BUTTON VISIBILITY) ---

  // This array defines the button data, including the onClick handler
  const quickActions = useMemo(
    () => [
      {
        label: "New Event",
        description: "Launch a new campaign or event page.",
        icon: Plus,
        // The prop passed from the main data component is wired up here
        onClick: onCreateEvent,
      },
      {
        label: "View Reports",
        description: "Access detailed analytics and export data.",
        icon: BarChart3,
        onClick: () => console.log("Simulating navigation to Reports page."),
      },
      {
        label: "Account Settings",
        description: "Manage billing, profile, and team access.",
        icon: Settings,
        onClick: () => console.log("Simulating navigation to Settings page."),
      },
    ],
    [onCreateEvent]
  );

  // --- 3. RENDER THE PRESENTATION LAYER (DashboardUI) ---

  return (
    <DashboardUI
      userName={userName}
      isLoading={isLoading}
      onLogout={onLogout}
      onCreateEvent={onCreateEvent}
      openDeleteModal={openDeleteModal}
      openAnalyticsModal={openAnalyticsModal}
      // Pass the calculated and defined props to the presentation component
      stats={stats}
      quickActions={quickActions}
      filteredEvents={filteredEvents}
      // View Toggle props
      activeView={activeView}
      onViewChange={setActiveView}
    />
  );
}
