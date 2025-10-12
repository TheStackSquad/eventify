// src/app/events/[id]/page.js

import React from "react";
import EventDetailClient from "./eventDetailClient";

// The page component must be async to await the params promise
const EventDetailPage = async ({ params = {} }) => {
  // ✅ FIX: Unwrap the params Promise as requested
  // This logic runs on the server, solving the warning
  const resolvedParams = await params;
  const { id: eventId } = resolvedParams; // Destructure and rename to eventId

  return (
    // Pass the resolved ID to the new client component
    <EventDetailClient eventId={eventId} />
  );
};

export default EventDetailPage;
