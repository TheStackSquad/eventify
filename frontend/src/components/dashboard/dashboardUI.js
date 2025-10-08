// frontend/src/components/dashboard/dashboardUI.js

"use client";

import { motion } from "framer-motion";
import {
  Ticket,
  Calendar,
  Users,
  CheckCircle,
  Barcode,
  LogOut,
  PlusCircle, // Added for the prominent CTA
} from "lucide-react";

// Add onCreateEvent to the props for the new CTA
export default function DashboardUI({
  userName,
  isLoading,
  tickets = [],
  onLogout,
  onCreateEvent, // New prop for the Create Event button action
}) {
  // Determine the display name:
  const displayName = userName || "User";
  const welcomeMessage = isLoading
    ? "Loading your dashboard..."
    : `Welcome back, ${displayName}!`;

  // Refactor stats for an Event Ticketing App (unchanged)
  const stats = [
    {
      icon: Ticket,
      label: "Tickets Purchased",
      value: tickets.length,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Calendar,
      label: "Upcoming Events",
      value: tickets.filter((t) => new Date(t.date) > new Date()).length,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Users,
      label: "Total Guests",
      value: tickets.reduce((sum, t) => sum + t.quantity, 0),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: CheckCircle,
      label: "Events Attended",
      value: tickets.filter((t) => t.status === "past").length,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  // --- Loading UI Block (No Change to its visual style, just kept concise) ---
  const LoadingState = (
    <div className="text-center py-20">
      <h2 className="text-3xl font-extrabold text-gray-900 font-header mb-4">
        {welcomeMessage}
      </h2>
      <p className="text-gray-500 font-body">
        Fetching user data and tickets...
      </p>
      <div className="mt-6 w-12 h-12 border-4 border-t-4 border-t-indigo-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
    </div>
  );

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header & Logout Button */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pb-8 border-b border-gray-200 mb-8 flex justify-between items-start"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 font-header">
              {welcomeMessage}
            </h1>
            <p className="mt-2 text-lg text-gray-600 font-body">
              View and manage your purchased tickets and upcoming events.
            </p>
          </div>

          {/* Logout Button */}
          {onLogout && !isLoading && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 shadow-md font-body whitespace-nowrap"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          )}
        </motion.header>

        {/* Display Loading State */}
        {isLoading && LoadingState}

        {/* Dashboard Content */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Create Event CTA (Visually Prominent) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-10 p-6 bg-indigo-600 rounded-xl shadow-xl flex flex-col md:flex-row justify-between items-center text-white"
            >
              <div className="text-center md:text-left mb-4 md:mb-0">
                <h2 className="text-2xl font-bold font-header">
                  Ready to Host an Event?
                </h2>
                <p className="mt-1 text-indigo-100 font-body">
                  Start your event creation journey here and reach thousands of
                  attendees.
                </p>
              </div>
              <button
                onClick={onCreateEvent}
                className="flex items-center space-x-2 px-6 py-3 bg-white text-indigo-600 font-bold rounded-lg shadow-lg hover:bg-gray-100 transition-colors duration-200 transform hover:scale-[1.03]"
                style={{
                  fontFamily: "var(--font-onest), system-ui, sans-serif",
                }}
              >
                <PlusCircle className="h-5 w-5" />
                <span>Create New Event</span>
              </button>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 + 0.5 }}
                  className="bg-white overflow-hidden rounded-xl shadow-lg border border-gray-100 p-6 transition-transform hover:shadow-xl hover:scale-[1.02]"
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <p className="ml-4 text-sm font-medium text-gray-500 font-body">
                      {stat.label}
                    </p>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-gray-900 font-header">
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Purchased Tickets Section (unchanged) */}
            <div className="mt-10">
              <h2 className="text-2xl font-semibold text-gray-900 font-header mb-4 border-b pb-2">
                Your Purchased Tickets
              </h2>

              {tickets.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
                  <Barcode className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-lg text-gray-600 font-body">
                    You haven&apos;t purchased any tickets yet!
                  </p>
                  <p className="text-sm text-gray-500 mt-1 font-body">
                    Explore our events to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* ... Ticket cards map (details omitted for brevity) ... */}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
