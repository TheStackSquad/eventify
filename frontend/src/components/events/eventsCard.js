// frontend/src/components/events/eventsCard.js
"use client";

import { MapPin, Calendar, Clock, Heart } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
import {
  toggleLikeOptimistic,
  toggleEventLike,
} from "@/redux/action/likeAction";

export default function EventCard({ event }) {
  const dispatch = useDispatch();
  
  // 1. **FIXED LOGIC:** Check for 'event' immediately before accessing any of its properties.
  if (!event || typeof event.price === "undefined") {
    return null;
  }

  // 2. Accessing properties is now safe because we confirmed 'event' is defined.
  const isFavorited = event.isLikedByUser || false;
  const likeCount = event.likeCount || 0;

  const tagColors = {
    Trending: "bg-yellow-100 text-yellow-800",
    "Almost Sold Out": "bg-red-100 text-red-800",
    New: "bg-green-100 text-green-800",
    "Free Ticket": "bg-blue-100 text-blue-800",
  };

  const handleLikeToggle = (e) => {
    e.stopPropagation();

    // 1. Dispatch OPTIMISTIC update to change UI immediately
    dispatch(toggleLikeOptimistic(event.id));

    // 2. Dispatch the API call to confirm with the server
    dispatch(toggleEventLike(event.id));
  };

  const {
    id, // Ensure event ID is destructured
    title,
    image,
    price,
    isFree,
    category,
    date,
    time,
    location,
    tag,
  } = event;

  const dateDisplay = date;
  const timeDisplay = time;
  const locationDisplay = location;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full group"
    >
      {/* Image and Tag Section */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Event Tag */}
        <div
          className={`absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full font-body z-10 ${
            tagColors[tag] || "bg-gray-100 text-gray-800"
          }`}
        >
          {tag || "Event"}
        </div>

        {/* Like Button & Count */}
        <div className="absolute top-3 right-3 z-10 flex items-center space-x-2">
          {/* Like Count Display */}
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isFavorited
                ? "bg-red-500 text-white"
                : "bg-white/70 text-gray-800 backdrop-blur-sm"
            }`}
          >
            {likeCount.toLocaleString()}
          </span>
          {/* Like Button */}
          <button
            onClick={handleLikeToggle}
            className={`p-2 rounded-full transition-colors ${
              isFavorited
                ? "bg-white text-red-500 hover:text-red-600 shadow-md"
                : "bg-white/70 text-gray-800 hover:text-red-500 backdrop-blur-sm shadow-md"
            }`}
          >
            {/* 🎯 FIX: Conditional fill for the Heart icon */}
            <Heart
              className="w-5 h-5"
              fill={isFavorited ? "currentColor" : "none"} // Fill with red when favorited
              strokeWidth={2} // Ensure the outline is visible when not filled
            />
          </button>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Category & Price */}
        <div className="flex justify-between items-start mb-2">
          <p className="text-sm font-semibold text-warm-yellow-500 uppercase tracking-wider font-body">
            {category}
          </p>
          <p className="text-xl font-extrabold text-green-600 font-header">
            {isFree ? "FREE" : `₦${price.toLocaleString()}`}
          </p>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 line-clamp-2 mb-4 font-header flex-grow">
          {title}
        </h3>

        {/* Details Section */}
        <div className="border-t pt-3 space-y-3 text-sm text-gray-700 font-body mt-auto">
          {/* Date */}
          <div className="flex items-center">
            <Calendar className="w-5 h-5 mr-3 text-red-500 flex-shrink-0" />
            <span className="font-medium">{dateDisplay}</span>
          </div>
          {/* Time */}
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-3 text-red-500 flex-shrink-0" />
            <span className="font-medium">{timeDisplay}</span>
          </div>
          {/* Location */}
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-3 text-red-500 flex-shrink-0" />
            <span className="line-clamp-1">{locationDisplay}</span>
          </div>
        </div>

        {/* 2. NAVIGATION FIX: Replaced button with Link component */}
        <Link
          // Construct the dynamic slug URL
          href={`/events/${id}`}
          className="mt-5 w-full py-3 bg-warm-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-warm-yellow-600 transition-colors shadow-md hover:shadow-lg font-body text-center block"
        >
          Find Tickets
        </Link>
      </div>
    </motion.div>
  );
}