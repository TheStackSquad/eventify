// frontend/src/components/dashboard/dashboardUI.js

"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  CheckCircle,
  LogOut,
  Sparkles,
  DollarSign,
  Barcode,
  Eye,
  PlusCircle,
  BarChart3,
  Ticket,
} from "lucide-react";

// Import new subcomponents
// import MyEvents from "@/components/dashboard/myEvents";
// import DashboardStats from "@/components/dashboard/dashboardStats";
// import DashboardQuickActions from "@/components/dashboard/dashboardQuickActions";
import MyEvents from "./myEvents";
import DashboardStats from "./dashboardStats";
import DashboardQuickActions from "./dashboardQuickActions";

export default function DashboardUI({
  userName,
  isLoading,
  events = [],
  purchasedTickets = [], // New prop for purchased tickets
  onLogout,
  onCreateEvent,
  openDeleteModal,
  openAnalyticsModal,
}) {
  const displayName = userName || "User";
  const welcomeMessage = isLoading
    ? "Loading your dashboard..."
    : `Welcome back, ${displayName}!`;

  // --- Data Calculations ---

  const now = new Date();

  // Event stats
  const totalEvents = events.length;
  const upcomingEvents = events.filter(
    (e) => new Date(e.startDate) > now
  ).length;
  const liveEvents = events.filter(
    (e) => new Date(e.startDate) <= now && new Date(e.endDate) >= now
  ).length;
  const pastEvents = events.filter((e) => new Date(e.endDate) < now).length;

  // Ticket inventory stats
  const totalTicketInventory = events.reduce(
    (sum, e) => sum + (e.tickets?.reduce((s, t) => s + t.quantity, 0) || 0),
    0
  );

  const totalTicketTiers = events.reduce(
    (sum, e) => sum + (e.tickets?.length || 0),
    0
  );

  // Potential revenue (if all tickets sold)
  const potentialRevenue = events.reduce((sum, e) => {
    const eventRevenue =
      e.tickets?.reduce((s, t) => s + t.price * t.quantity, 0) || 0;
    return sum + eventRevenue;
  }, 0);

  // --- Configuration Objects ---

  // Stats configuration (Passed to DashboardStats)
  const stats = [
    {
      icon: Calendar,
      label: "Total Events",
      value: totalEvents,
      subtext: `${liveEvents} live, ${upcomingEvents} upcoming`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      icon: Users,
      label: "Ticket Inventory",
      value: totalTicketInventory.toLocaleString(),
      subtext: `Across ${totalTicketTiers} tiers`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      icon: DollarSign,
      label: "Potential Revenue",
      value: `₦${(potentialRevenue / 1000).toFixed(0)}k`,
      subtext: "If all tickets sell",
      color: "text-green-600",
      bgColor: "bg-green-50",
      gradient: "from-green-500 to-green-600",
    },
    {
      icon: CheckCircle,
      label: "Completed Events",
      value: pastEvents,
      subtext: pastEvents > 0 ? "View insights" : "None yet",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      gradient: "from-amber-500 to-amber-600",
    },
  ];

  // Quick actions for organizers (Passed to DashboardQuickActions)
  const quickActions = [
    {
      icon: PlusCircle,
      label: "Create Event",
      description: "Start a new event",
      color: "bg-indigo-600 hover:bg-indigo-700",
      onClick: onCreateEvent,
    },
    {
      icon: BarChart3,
      label: "Analytics",
      description: "View performance",
      color: "bg-purple-600 hover:bg-purple-700",
      onClick: () => console.log("Navigate to analytics"),
    },
    {
      icon: Ticket,
      label: "All Tickets",
      description: "Manage tickets",
      color: "bg-blue-600 hover:bg-blue-700",
      onClick: () => console.log("Navigate to tickets"),
    },
  ];

  // Loading state component
  const LoadingState = (
    <div className="text-center py-20">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {welcomeMessage}
      </h2>
      <p className="text-gray-500">Setting up your dashboard...</p>
    </div>
  );

  // --- Main Render ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pb-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {welcomeMessage}
                </h1>
                {!isLoading && (
                  <Sparkles className="w-7 h-7 text-yellow-500 animate-pulse" />
                )}
              </div>
              <p className="text-lg text-gray-600">
                Manage your events, track performance, and grow your audience.
              </p>
            </div>

            {/* Logout Button */}
            {onLogout && !isLoading && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </motion.header>

        {/* Loading State */}
        {isLoading && LoadingState}

        {/* Dashboard Content */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-8"
          >
            {/* Stats Grid (NOW USING SUB-COMPONENT) */}
            <DashboardStats stats={stats} />

            {/* Quick Actions (NOW USING SUB-COMPONENT) */}
            <DashboardQuickActions quickActions={quickActions} />

            {/* Created Events Section (UNCHANGED WRAPPER) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Your Events
                  </h2>
                  <p className="text-sm text-gray-600">
                    {totalEvents} {totalEvents === 1 ? "event" : "events"}{" "}
                    created
                  </p>
                </div>
                {totalEvents > 0 && (
                  <button
                    onClick={onCreateEvent}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                  >
                    <PlusCircle className="h-4 w-4" />
                    New Event
                  </button>
                )}
              </div>
              <MyEvents
                events={events}
                openDeleteModal={openDeleteModal}
                openAnalyticsModal={openAnalyticsModal}
              />
            </motion.div>

            {/* Purchased Tickets Section (UNCHANGED WRAPPER) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Your Tickets
                </h2>
                <p className="text-sm text-gray-600">
                  Events you&apos;re attending
                </p>
              </div>

              <div className="text-center py-16 bg-white rounded-2xl shadow-md border-2 border-dashed border-gray-200">
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Barcode className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No Tickets Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You haven&apos;t purchased any tickets yet.
                  </p>
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                    <Eye className="h-5 w-5" />
                    Explore Events
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
