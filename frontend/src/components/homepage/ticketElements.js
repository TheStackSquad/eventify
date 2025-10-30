// src/components/homepage/ticketElements.js

import React, { useState, useMemo } from "react";

export const formatPrice = (price) => {
  if (price === 0 || price === null) return "FREE";
  // Add null check for price
  if (typeof price !== "number") return "Price TBD";

  return `₦${price.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// Safe version of getStartingPrice
const getStartingPrice = (tickets) => {
  // Ensure tickets is an array
  const safeTickets = Array.isArray(tickets) ? tickets : [];

  // Filter available tickets safely
  const availableTickets = safeTickets.filter((t) => t && t.available);

  if (availableTickets.length === 0) return null;

  // Safely extract prices
  const prices = availableTickets
    .map((t) => t.price)
    .filter((price) => typeof price === "number");

  if (prices.length === 0) return null;

  const minPrice = Math.min(...prices);
  return minPrice;
};

export const TicketSelector = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Safely handle event data
const safeTickets = useMemo(() => {
    const safeEvent = event || {};
    return Array.isArray(safeEvent.tickets) ? safeEvent.tickets : [];
  }, [event]); // Dependency is 'event'

  // Memoize calculations with safe data
  const startingPrice = useMemo(
    () => getStartingPrice(safeTickets),
    [safeTickets] // safeTickets is now stable when event doesn't change
  );

  const hasMultipleTickets = safeTickets.length > 1;
  const isFree = startingPrice === 0;
  const allSoldOut =
    safeTickets.length === 0 || safeTickets.every((t) => !t || !t.available);

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      {/* Starting Price Display (Toggle button) */}
      <div
        className={`flex items-center justify-between ${
          hasMultipleTickets ? "cursor-pointer" : ""
        }`}
        onClick={() => hasMultipleTickets && setIsExpanded(!isExpanded)}
      >
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
            {allSoldOut ? "Sold Out" : isFree ? "Free Entry" : "Starting From"}
          </p>
          <p
            className={`text-2xl font-black ${
              isFree
                ? "text-green-600"
                : allSoldOut
                ? "text-gray-400"
                : "text-blue-600"
            }`}
          >
            {allSoldOut ? "SOLD OUT" : formatPrice(startingPrice)}
          </p>
        </div>

        {hasMultipleTickets && !allSoldOut && (
          <button
            className="flex items-center gap-1 text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <span>{isExpanded ? "Hide" : "View"} Options</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded Ticket Options */}
      {isExpanded && hasMultipleTickets && (
        <div className="space-y-2 pt-2 border-t border-gray-200 animate-in slide-in-from-top duration-300">
          {safeTickets.map((ticket, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTicket(ticket)}
              disabled={!ticket || !ticket.available}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200
                ${
                  !ticket || !ticket.available
                    ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                    : selectedTicket === ticket
                    ? "bg-blue-50 border-blue-500 shadow-sm"
                    : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${
                      !ticket || !ticket.available
                        ? "border-gray-300"
                        : selectedTicket === ticket
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                >
                  {selectedTicket === ticket && ticket && ticket.available && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="text-left">
                  <p
                    className={`text-sm font-semibold ${
                      !ticket || !ticket.available
                        ? "text-gray-400"
                        : "text-gray-900"
                    }`}
                  >
                    {ticket?.type || "General Admission"}
                  </p>
                  {(!ticket || !ticket.available) && (
                    <p className="text-xs text-red-500 font-medium">Sold Out</p>
                  )}
                  {ticket && ticket.available && ticket.quantity < 20 && (
                    <p className="text-xs text-orange-500 font-medium">
                      Only {ticket.quantity} left
                    </p>
                  )}
                </div>
              </div>
              <p
                className={`text-lg font-bold ${
                  !ticket || !ticket.available
                    ? "text-gray-400"
                    : "text-gray-900"
                }`}
              >
                {formatPrice(ticket?.price)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
