// frontend/src/components/homepage/eventCard.js
"use client";

import React, { useMemo, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { TicketSelector } from "./ticketElements";
import { CalendarIcon, LocationIcon, ShoppingBagIcon } from "./icons";

const EventCard = memo(({ event }) => {
  const allSoldOut = useMemo(
    () => event.tickets.every((t) => !t.available),
    [event.tickets]
  );

  return (
    <div className="flex-shrink-0 w-[85vw] sm:w-[75vw] md:w-80 lg:w-96 snap-start p-4 mr-4 bg-white rounded-2xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      {/* Event Image and Badges */}
      <div className="relative h-48 md:h-52 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-4 overflow-hidden group">
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(max-width: 640px) 85vw, (max-width: 768px) 75vw, 384px"
          loading="lazy"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-300" />

        {/* Category badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full z-10">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {event.category}
          </span>
        </div>

        {/* Tag badge */}
        {event.tag && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full z-10">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {event.tag}
            </span>
          </div>
        )}
      </div>

      {/* Event Details */}
      <div className="space-y-3">
        {/* Title */}
        <h4 className="text-lg md:text-xl font-bold text-gray-900 line-clamp-2 leading-tight">
          {event.title}
        </h4>

        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mr-3 flex-shrink-0">
              <CalendarIcon />
            </div>
            <span className="font-medium">{event.date}</span>
            <span className="mx-2 text-gray-400">•</span>
            <span className="font-medium">{event.time}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mr-3 flex-shrink-0">
              <LocationIcon />
            </div>
            <span className="font-medium line-clamp-1">{event.location}</span>
          </div>
        </div>

        {/* Ticket Selector */}
        <TicketSelector event={event} />

        {/* CTA Button */}
        <Link
          href={`/events/${event.id}`}
          className={`w-full flex items-center justify-center py-3 px-4 font-semibold rounded-xl transition-all duration-300 shadow-md transform active:scale-95 ${
            allSoldOut
              ? "bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none"
              : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-lg hover:scale-[1.02]"
          }`}
          aria-disabled={allSoldOut}
        >
          <ShoppingBagIcon />
          {allSoldOut ? "Sold Out" : "Buy Tickets"}
        </Link>
      </div>
    </div>
  );
});
EventCard.displayName = "EventCard";

export default EventCard;
