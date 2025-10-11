//frontend/src/components/dashboard/myEvents.js

// frontend/src/components/dashboard/myEvents.js

import React from "react";
import { Clock, Calendar, TrendingUp } from "lucide-react";

// Import the sub-components and utilities
import EventCard from "@/components/dashboard/myEvents/eventCard";
// No need to import utilities here since EventCard handles them, 
// but we'll import Calendar icon for the empty state.

export default function MyEvents({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No Events Created Yet
          </h3>
          <p className="text-gray-600 mb-1">
            Start creating amazing events and reach thousands of attendees!
          </p>
          <p className="text-sm text-gray-500">
            Click the{" "}
            <span className="font-semibold">
              **&quot;Create New Event&quot;**</span>{" "}
            button above to get started.
          </p>
        </div>
      </div>
    );
  }

  // Separate events by status
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.startDate) > now);
  const liveEvents = events.filter(
    (e) => new Date(e.startDate) <= now && new Date(e.endDate) >= now
  );
  const pastEvents = events.filter((e) => new Date(e.endDate) < now);

  const EventList = ({ title, icon: Icon, events, color, animate }) => (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {animate ? (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        ) : (
          <Icon className={`w-5 h-5 ${color}`} />
        )}
        <h3 className="text-lg font-bold text-gray-900">
          {title} ({events.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Live Events */}
      {liveEvents.length > 0 && (
        <EventList
          title="Live Now"
          events={liveEvents}
          color="text-green-500"
          animate={true} // Special pulse animation for live events
        />
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <EventList
          title="Upcoming"
          icon={Clock}
          events={upcomingEvents}
          color="text-blue-500"
        />
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <EventList
          title="Past Events"
          icon={TrendingUp}
          events={pastEvents}
          color="text-gray-400"
        />
      )}
    </div>
  );
}