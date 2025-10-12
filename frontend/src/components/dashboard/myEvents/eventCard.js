// frontend/src/components/dashboard/myEvents/eventCard.js

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  Edit,
  BarChart3,
  Trash2,
  Calendar,
  MapPin,
  Users,
  DollarSign,
} from "lucide-react";

// Import utilities
import {
  getDaysUntil,
  getEventStatus,
} from "@/components/dashboard/myEvents/eventUtils";
import { fetchEventAnalytics } from "@/redux/action/eventAction";

export default function EventCard({ event, openDeleteModal, openAnalyticsModal }) { 
  const router = useRouter();
  const dispatch = useDispatch();
  const {
    id,
    eventTitle,
    eventImage,
    venueName,
    city,
    startDate,
    endDate,
    tickets,
    eventType,
  } = event;

  const formattedDate = new Date(startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = new Date(startDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate ticket data
  const totalTickets =
    tickets?.reduce((sum, tier) => sum + tier.quantity, 0) || 0;
  const lowestPrice =
    tickets?.length > 0 ? Math.min(...tickets.map((t) => t.price)) : 0;
  const highestPrice =
    tickets?.length > 0 ? Math.max(...tickets.map((t) => t.price)) : 0;
  const ticketTiers = tickets?.length || 0;

  // Event status and countdown
  const status = getEventStatus(startDate, endDate);
  const daysUntil = getDaysUntil(startDate);
  const isOnline = eventType === "virtual";
  const isPast = new Date(endDate) < new Date();

  // Handler stubs for organizer actions
  // 1. EDIT: Redirect to a pre-filled form
  const handleEdit = () => {
    router.push(`/events/create-events?id=${id}`);
  };

  // 2. SALES: Fetch data, then open modal (Modal is opened by parent component watching Redux state)
  const handleViewSales = () => {
    dispatch(fetchEventAnalytics(id));
    openAnalyticsModal(id);
  };

  // 3. DELETE: Open a confirmation modal
  const handleDelete = () => {
    openDeleteModal(id, eventTitle);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
    >
      {/* Event Image with Status Badge */}
      <div className="relative h-48 group">
        <Image
          src={eventImage || "/img/placeholder.jpg"}
          alt={eventTitle}
          fill={true}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          style={{ objectFit: "cover" }}
          priority
          className="group-hover:scale-105 transition-transform duration-300"
        />

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span
            className={`${status.color} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg`}
          >
            {status.label}
          </span>
          {isOnline && (
            <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              Virtual
            </span>
          )}
        </div>

        {/* Countdown Badge for Upcoming Events */}
        {!isPast && daysUntil >= 0 && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            {daysUntil === 0 ? "Today!" : `${daysUntil}d away`}
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-3 min-h-[3.5rem]">
          {eventTitle}
        </h3>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <div>
              <p className="text-xs text-gray-500">Tickets</p>
              <p className="text-sm font-bold text-gray-900">{totalTickets}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Tiers</p>
              <p className="text-sm font-bold text-gray-900">{ticketTiers}</p>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-2 mb-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">{formattedDate}</p>
              <p className="text-xs text-gray-500">{formattedTime}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="line-clamp-1">
              {isOnline
                ? "Virtual Event"
                : `${venueName || "Venue TBD"}, ${city}`}
            </p>
          </div>
        </div>

        {/* Price Range */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-600 mb-1">Price Range</p>
          {lowestPrice === highestPrice ? (
            <p className="text-lg font-bold text-green-700">
              ₦{lowestPrice.toLocaleString()}
            </p>
          ) : (
            <p className="text-lg font-bold text-green-700">
              ₦{lowestPrice.toLocaleString()} - ₦{highestPrice.toLocaleString()}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleEdit}
            className="flex flex-col items-center justify-center py-2.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors group"
            title="Edit Event"
          >
            <Edit className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleViewSales}
            className="flex flex-col items-center justify-center py-2.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors group"
            title="View Analytics"
          >
            <BarChart3 className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform" />
            <span>Sales</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex flex-col items-center justify-center py-2.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors group"
            title="Delete Event"
          >
            <Trash2 className="h-4 w-4 mb-1 group-hover:scale-110 transition-transform" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
