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
    // Assuming you have imported all necessary icons (Calendar, Users, TrendingUp, Edit, BarChart3, Trash2)
    // and have the helper functions like formatDate, statusClass, statusBadge, mockAttendees, mockRevenue, etc. available in scope.

    // Component body
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-xl transition-all duration-300 transform hover:scale-[1.01] border-t-4 ${statusClass} flex flex-col h-full`}
    >
      <div className="p-5 flex flex-col flex-grow">
        {/* Header: Title and Status Badge */}
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-xl md:text-2xl font-extrabold text-gray-900 leading-snug line-clamp-2 pr-2">
            {event.eventTitle || "Untitled Event"}
          </h4>
          {statusBadge}
        </div>

        {/* Description (Truncated to 2 lines for card view) */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {event.eventDescription || "No description provided."}
        </p>

        {/* Metadata Grid (Responsive stack/side-by-side) */}
        <div className="space-y-3 pt-4 border-t border-gray-100 flex-grow">
          {/* Date/Time */}
          <div className="flex items-start text-sm text-gray-700">
            <Calendar className="w-4 h-4 mt-[2px] mr-3 flex-shrink-0 text-indigo-600" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block sm:inline-block sm:mr-1">
                Date:
              </span>{" "}
              <span className="truncate block sm:inline-block">
                {formatDate(event.startDate)}
              </span>
            </div>
          </div>
          {/* Attendees */}
          <div className="flex items-start text-sm text-gray-700">
            <Users className="w-4 h-4 mt-[2px] mr-3 flex-shrink-0 text-indigo-600" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block sm:inline-block sm:mr-1">
                Attendees:
              </span>{" "}
              <span className="truncate block sm:inline-block">
                {mockAttendees}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Section (Always at the bottom of the content) */}
        <div className="mt-5">
          <div className="flex justify-between items-center bg-indigo-50/70 p-4 rounded-lg">
            <div className="text-base font-semibold text-gray-800 flex items-center min-w-0">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600 flex-shrink-0" />
              <span className="truncate">Revenue:</span>
            </div>
            <div className="text-lg font-bold text-green-700 ml-3 flex-shrink-0">
              {/* 🎯 FIX: Changed to Naira sign (₦) */}
              <span className="text-sm font-normal mr-1">₦</span>
              {mockRevenue}
              <span className="text-xs font-normal text-gray-600 ml-1">
                (Mock)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Full width on mobile, maintains structure) */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-100 mt-4">
          <button
            onClick={() => console.log(`Editing event ${event.id}`)}
            className="flex-1 flex items-center justify-center p-2.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors shadow-sm min-w-0"
          >
            <Edit className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Edit</span>
          </button>

          <button
            onClick={() => openAnalyticsModal(event.id)}
            className="flex-1 flex items-center justify-center p-2.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors shadow-sm min-w-0"
          >
            <BarChart3 className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">Analytics</span>
          </button>

          {/* Delete button remains small for quick action */}
          <button
            onClick={() => openDeleteModal(event.id, event.eventTitle)}
            className="flex-shrink-0 p-2.5 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors shadow-sm self-stretch sm:w-auto"
            title="Delete Event"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
// --- End EventCard Component Definition ---

export default function MyEvents({
  // Props remain the same, receiving pre-filtered lists
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
