// frontend/src/components/homepage/utils.js
export const mapEventData = (rawEvent) => {
  if (!rawEvent) {
    return {
      id: "fallback-id",
      title: "Event not available",
      image: "/fallback-image.jpg",
      category: "General",
      tag: null,
      date: "TBD",
      time: "TBD",
      location: "Location TBD",
      tickets: [],
    };
  }

  const startDate = rawEvent.startDate
    ? new Date(rawEvent.startDate)
    : new Date();
  const startTime = startDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const safeTickets = Array.isArray(rawEvent.tickets) ? rawEvent.tickets : [];

  const startingPrice = safeTickets[0]?.price ?? 0;
  let tag = null;
  if (startingPrice === 0) {
    tag = "Free Entry";
  } else if (startingPrice > 10000) {
    tag = "High Demand";
  }

  return {
    id: rawEvent.id || "unknown-id",
    title: rawEvent.eventTitle || "Untitled Event",
    image: rawEvent.eventImage || "/fallback-image.jpg",
    category: rawEvent.category || "General",
    tag: tag,
    date: formattedDate,
    time: startTime,
    location: `${rawEvent.venueName || "Venue TBD"}, ${
      rawEvent.city || "City TBD"
    }`,
    tickets: safeTickets.map((ticket) => ({
      ...ticket,
      available: (ticket.quantity || 0) > 0,
    })),
  };
};
