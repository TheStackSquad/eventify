// frontend/src/components/homepage/ticketCard.js
"use client";

import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { mapEventData } from "@/components/homepage/utils";
import { LoadingState, EmptyState } from "@/components/homepage/states";
import SectionHeader from "@/components/homepage/sectionHeader";
import EventsSlider from "@/components/homepage/eventSlider";

export default function UpcomingEvents() {
  const { allEvents, allEventsStatus } = useSelector(
    (state) => state.events || {}
  );

  // Memoize events processing with better error handling
  const eventsToDisplay = useMemo(() => {
    try {
      const eventsArray = Array.isArray(allEvents) ? allEvents : [];
      return eventsArray.slice(0, 10).map(mapEventData); // Limit to 10 events for performance
    } catch (error) {
      console.error("Error processing events data:", error);
      return [];
    }
  }, [allEvents]);

  // Handle Loading State
  if (allEventsStatus === "loading") {
    return <LoadingState />;
  }

  // Handle No Events Found State
  if (eventsToDisplay.length === 0 && allEventsStatus !== "loading") {
    return <EmptyState />;
  }

  return (
    <section className="relative px-1 md:px-6 py-12 md:py-16 bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        {/* Main Container */}
        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 shadow-2xl rounded-3xl md:rounded-[2rem] p-6 md:p-10 lg:p-12 overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl translate-y-32 -translate-x-32" />

          <SectionHeader />
          <EventsSlider events={eventsToDisplay} />
        </div>
      </div>
    </section>
  );
}
