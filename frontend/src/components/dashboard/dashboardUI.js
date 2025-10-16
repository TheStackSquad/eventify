// src/components/dashboard/DashboardUI.js
"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  LogOut,
  Sparkles,
  Barcode,
  Eye,
  PlusCircle,
  UserCheck,
} from "lucide-react";

// FIX: Corrected import paths for subcomponents to resolve compilation errors
import MyEvents from "@/components/dashboard/myEvents";
import DashboardStats from "@/components/dashboard/dashboardStats";
import DashboardQuickActions from "@/components/dashboard/dashboardQuickActions";
import VendorsDashboard from "@/components/dashboard/vendorDashboard";

export default function DashboardUI({
  userName,
  isLoading,
  onLogout,
  onCreateEvent, // Passed down for quick action button
  openDeleteModal, // Passed down to MyEvents
  openAnalyticsModal, // Passed down to MyEvents

  // NEW PRESENTATIONAL PROPS (Pre-calculated/Configured by Container)
  stats,
  quickActions,
  filteredEvents, // { liveEvents, upcomingEvents, pastEvents }

  // View Toggle props
  activeView = "events",
  onViewChange,

  // Removed unused props: events, purchasedTickets
}) {
  const displayName = userName || "User";
  const welcomeMessage = isLoading
    ? "Loading your dashboard..."
    : `Welcome back, ${displayName}!`;

  // --- MINIMAL UI-BASED LOGIC ---
  // Only calculate the total event count if the filtered list exists (acceptable calculation for presentation)
const totalEvents =
  (filteredEvents?.liveEvents?.length ?? 0) +
  (filteredEvents?.upcomingEvents?.length ?? 0) +
  (filteredEvents?.pastEvents?.length ?? 0);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Toggle */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pb-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  {welcomeMessage}
                </h1>
                {!isLoading && (
                  <Sparkles className="w-7 h-7 text-yellow-500 animate-pulse" />
                )}
              </div>
              <p className="text-lg text-gray-600">
                {activeView === "events"
                  ? "Manage your events, track performance, and grow your audience."
                  : "Manage vendor verifications, contracts, and payments."}
              </p>
            </div>

            {/* View Toggle and Logout */}
            <div className="flex items-center gap-4">

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
            {/* Stats Grid - Uses pre-calculated/configured 'stats' prop */}
            <DashboardStats stats={stats} />

            {/* Quick Actions - Uses pre-configured 'quickActions' prop */}
            <DashboardQuickActions quickActions={quickActions} />

            {/* Dynamic Content Based on Active View */}
            {activeView === "events" ? (
              <>
                {/* Events Section */}
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
                  {/* MyEvents now receives pre-filtered lists directly */}
                  <MyEvents
                    liveEvents={filteredEvents?.liveEvents || []}
                    upcomingEvents={filteredEvents?.upcomingEvents || []}
                    pastEvents={filteredEvents?.pastEvents || []}
                    openDeleteModal={openDeleteModal}
                    openAnalyticsModal={openAnalyticsModal}
                  />
                </motion.div>

                {/* Purchased Tickets Section (Kept static/mock for now) */}
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
              </>
            ) : (
              /* Vendors Section */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                {/* Note: VendorsDashboard still uses mock props here, 
                    but in a complete refactor, a VendorsContainer would provide the data. 
                    For now, we keep the original structure for this section. */}
                <VendorsDashboard />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
