// src/components/dashboard/MyEvents.js

import React from "react";
import {
  Clock,
  Calendar,
  TrendingUp,
  BarChart3,
  Trash2,
  Edit,
  Users,
} from "lucide-react";

// The EventCard component is now defined locally to resolve the import error.
// In a full, multi-file React project, this would be in its own file.

// --- EventCard Component Definition ---
// Mock Utility function for date formatting (should usually be external)
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const EventCard = ({ event, openDeleteModal, openAnalyticsModal }) => {
  const isLive =
    new Date(event.startDate) <= new Date() &&
    new Date(event.endDate) >= new Date();

  // Mock data for card metrics
  const mockAttendees = Math.floor(Math.random() * 500) + 10;
  const mockRevenue = (mockAttendees * (Math.random() * 50 + 5)).toFixed(2);

  // Determine card appearance based on status
  const statusClass = isLive
    ? "border-green-400 ring-4 ring-green-100 shadow-xl"
    : new Date(event.endDate) < new Date()
    ? "border-gray-300 opacity-80"
    : "border-indigo-400";

  const statusBadge = isLive ? (
    <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 animate-pulse">
      <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
      LIVE NOW
    </span>
  ) : new Date(event.endDate) < new Date() ? (
    <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10">
      FINISHED
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
      UPCOMING
    </span>
  );

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-t-4 ${statusClass}`}
    >
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <h4 className="text-xl font-bold text-gray-900 leading-tight">
            {event.title || "Untitled Event"}
          </h4>
          {statusBadge}
        </div>

        <p className="text-sm text-gray-600 mb-2 truncate">
          {event.description || "No description provided."}
        </p>

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="font-medium">Date:</span>{" "}
            {formatDate(event.startDate)}
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <Users className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="font-medium">Attendees:</span> {mockAttendees}
          </div>
        </div>

        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mt-3">
          <div className="text-sm font-semibold text-gray-700 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1.5 text-green-500" />
            Revenue:{" "}
            <span className="text-green-600 ml-1 font-bold">
              ${mockRevenue}
            </span>{" "}
            (Mock)
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => console.log(`Editing event ${event.id}`)}
            className="flex-1 flex items-center justify-center p-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
          <button
            onClick={() => openAnalyticsModal(event.id)}
            className="flex-1 flex items-center justify-center p-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Analytics
          </button>
          <button
            onClick={() => openDeleteModal(event.id, event.title)}
            className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            title="Delete Event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
// --- End EventCard Component Definition ---

export default function MyEvents({
  // NEW PROPS: Receive pre-filtered event lists directly from container
  liveEvents = [],
  upcomingEvents = [],
  pastEvents = [],

  // Action props remain
  openDeleteModal,
  openAnalyticsModal,
}) {
  // Combine all lists to check for the empty state
  const totalEvents =
    liveEvents.length + upcomingEvents.length + pastEvents.length;

  // 1. Empty State
  if (totalEvents === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 shadow-inner">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-xl border border-gray-100">
            <Calendar className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">
            No Events Created Yet
          </h3>
          <p className="text-gray-600 mb-1">
            Start creating amazing events and reach thousands of attendees!
          </p>
          <p className="text-sm text-gray-500">
            Click the{" "}
            <span className="font-semibold text-indigo-600">
              &quot;New Event&quot;
            </span>{" "}
            button at the top to get started.
          </p>
        </div>
      </div>
    );
  }

  // 2. Helper Component for rendering lists
  const EventList = ({ title, icon: Icon, events, color, animate }) =>
    events.length > 0 && (
      <div>
        <div className="flex items-center gap-2 mb-4">
          {animate ? (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-green-500/50 shadow-md"></div>
          ) : (
            <Icon className={`w-5 h-5 ${color}`} />
          )}
          <h3 className="text-lg font-bold text-gray-900">
            {title} ({events.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              openDeleteModal={openDeleteModal}
              openAnalyticsModal={openAnalyticsModal}
            />
          ))}
        </div>
      </div>
    );

  // 3. Main Render
  return (
    <div className="space-y-10">
      {/* Live Events */}
      <EventList
        title="Live Now"
        events={liveEvents}
        color="text-green-500"
        animate={true}
      />

      {/* Upcoming Events */}
      <EventList
        title="Upcoming"
        icon={Clock}
        events={upcomingEvents}
        color="text-indigo-500"
      />

      {/* Past Events */}
      <EventList
        title="Past Events"
        icon={TrendingUp}
        events={pastEvents}
        color="text-gray-500"
      />
    </div>
  );
}
