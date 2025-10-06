// src/components/homepage/ticketCard.js
"use client";

import React from "react"; // Removed useState
// Using next/image for optimized images
import Image from "next/image";
import { dummyEvents } from "@/data/upcomingEvents";
import Link from "next/link";
// Import the new component and utility
import { TicketSelector, formatPrice } from "./ticketElements";

// NOTE: getStartingPrice and formatPrice were moved to ticketElements.js

// Enhanced EventCard with external TicketSelector
const EventCard = ({ event }) => {
  // NOTE: isExpanded and selectedTicket state are now managed inside TicketSelector

  // NOTE: These utility calls should be moved to TicketSelector or redefined/imported here if needed for the CTA
  const allSoldOut = event.tickets.every((t) => !t.available);

  return (
    <div className="flex-shrink-0 w-[85vw] sm:w-[75vw] md:w-80 lg:w-96 snap-start p-4 mr-4 bg-white rounded-2xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      {/* Event Image and Badges... (same as before) */}
      <div className="relative h-48 md:h-52 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-4 overflow-hidden group">
        {/* Image Component */}
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 85vw, (max-width: 1024px) 75vw, 384px"
          priority={event.id <= 2}
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

      {/* Event Details with improved spacing */}
      <div className="space-y-3">
        {/* Title */}
        <h4 className="text-lg md:text-xl font-bold text-gray-900 line-clamp-2 leading-tight">
          {event.title}
        </h4>

        {/* Metadata with enhanced icons and spacing... (same as before) */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mr-3 flex-shrink-0">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-medium">{event.date}</span>
            <span className="mx-2 text-gray-400">•</span>
            <span className="font-medium">{event.time}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mr-3 flex-shrink-0">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-medium line-clamp-1">{event.location}</span>
          </div>
        </div>

        {/* --- REPLACED WITH SPLIT COMPONENT --- */}
        <TicketSelector event={event} />

        {/* Enhanced CTA Button */}
        <button
          disabled={allSoldOut}
          className={`w-full flex items-center justify-center py-3 px-4 font-semibold rounded-xl transition-all duration-300 shadow-md transform active:scale-95
            ${
              allSoldOut
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-lg hover:scale-[1.02]"
            }`}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          {allSoldOut ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
};

// ... (UpcomingEvents component remains the same)
// ... (Note: You still need to ensure the Link button inside UpcomingEvents
// ... has the modern implementation as discussed in the previous turn)

export default function UpcomingEvents() {
  return (
    <section className="relative px-1 md:px-6 py-12 md:py-16 bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        {/* Main Container with enhanced styling */}
        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 shadow-2xl rounded-3xl md:rounded-[2rem] p-6 md:p-10 lg:p-12 overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl translate-y-32 -translate-x-32" />

          {/* Header with improved typography */}
          <div className="flex items-start justify-between mb-8 md:mb-10 relative z-10">
            {/* Enhanced title with better spacing */}
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-2">
                Upcoming
                <br className="hidden sm:block" />
                <span className="block mt-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Events
                </span>
              </h2>
              <p className="text-sm md:text-base text-gray-600 mt-2 font-medium">
                Discover amazing experiences near you
              </p>
            </div>
            {/* Enhanced Plus Button with better animations */}
            <Link
              href="/onboarding"
              className="flex-shrink-0 group cursor-pointer"
            >
              <div
              
                className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <svg
                  className="w-7 h-7 md:w-10 md:h-10 text-black transform group-hover:rotate-90 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </Link>
          </div>

          {/* Event Cards Slider with improved scroll behavior */}
          <div
            className="flex overflow-x-auto pb-6 -mx-6 md:-mx-10 lg:-mx-12 scroll-smooth"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div className="flex px-6 md:px-10 lg:px-12">
              {dummyEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {/* Spacer for better end-scroll experience */}
              <div className="w-4 flex-shrink-0"></div>
            </div>
          </div>

          {/* Enhanced scroll hint with animation */}
          <div className="flex items-center justify-center mt-6 gap-2 animate-pulse">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <p className="text-xs md:text-sm text-gray-500 font-medium tracking-wide">
              Swipe to explore more events
            </p>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
