//src/components/dashboard/dashboardUI.js

"use client";

import { motion } from "framer-motion";
import {
  Ticket,
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  Clock,
  Barcode,
} from "lucide-react";

export default function DashboardUI({ userName, isLoading, tickets = [] }) {
  // Determine the display name:
  const displayName = userName || "User";
  const welcomeMessage = isLoading
    ? "Loading your dashboard..."
    : `Welcome back, ${displayName}!`;

  // Refactor stats for an Event Ticketing App
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
      // Filter tickets that have a date in the future
      value: tickets.filter((t) => new Date(t.date) > new Date()).length,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Users,
      label: "Total Guests",
      // Sum the quantity of all tickets
      value: tickets.reduce((sum, t) => sum + t.quantity, 0),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: CheckCircle,
      label: "Events Attended",
      // Filter tickets marked as 'past'
      value: tickets.filter((t) => t.status === "past").length,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pb-8 border-b border-gray-200 mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 font-header">
            {welcomeMessage}
          </h1>
          <p className="mt-2 text-lg text-gray-600 font-body">
            View and manage your purchased tickets and upcoming events.
          </p>
        </motion.header>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-20">
            <p className="text-gray-500 font-body">
              Fetching user data and tickets...
            </p>
            <div className="mt-4 w-10 h-10 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
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

            {/* Purchased Tickets Section */}
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
                  {tickets.map((ticket, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className={`bg-white rounded-xl shadow-xl overflow-hidden border-t-4 p-6 
                        ${
                          ticket.status === "upcoming"
                            ? "border-blue-500"
                            : "border-gray-400"
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p
                            className={`text-xs font-semibold uppercase tracking-wider ${
                              ticket.status === "upcoming"
                                ? "text-blue-600"
                                : "text-gray-500"
                            } font-body`}
                          >
                            {ticket.status === "upcoming"
                              ? "Upcoming"
                              : "Past Event"}
                          </p>
                          <h3 className="text-xl font-bold text-gray-900 mt-1 font-header">
                            {ticket.eventName}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 font-body">
                            Tickets
                          </p>
                          <p className="text-3xl font-extrabold text-gray-700 font-header">
                            {ticket.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-gray-600 font-body">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          <span>
                            {new Date(ticket.date).toDateString()} at{" "}
                            {ticket.time}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          <span>{ticket.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          <span>Purchased: {ticket.purchaseDate}</span>
                        </div>
                      </div>

                      {ticket.status === "upcoming" && (
                        <button className="mt-6 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 font-body">
                          View e-Ticket / QR Code
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
