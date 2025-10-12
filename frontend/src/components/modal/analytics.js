// frontend/src/components/modal/analytics.js

import React from "react";
import { motion } from "framer-motion";
import { X, BarChart3, Ticket, DollarSign } from "lucide-react";

// Placeholder for analytics data structure
const DUMMY_ANALYTICS = {
  totalTicketsSold: 150,
  totalRevenue: 7500000,
  ticketsAvailable: 50,
  conversionRate: 15.5, // percent
};

export default function AnalyticsModal({
  isOpen,
  onClose,
  analyticsData, // The actual data from Redux state
  eventTitle = "Event Sales Analytics",
  isLoading = false,
}) {
  if (!isOpen) return null;

  // Use dummy data if real data is not available (for demonstration)
  const data = analyticsData || DUMMY_ANALYTICS;

  // Format currency
  const formatCurrency = (amount) => `₦${amount.toLocaleString()}`;

  // Simple modal backdrop and content animation
  const backdropVariants = { visible: { opacity: 1 }, hidden: { opacity: 0 } };
  const modalVariants = {
    visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.3 } },
    hidden: { y: "100vh", opacity: 0, scale: 0.8 },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4"
        variants={modalVariants}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 text-green-500 mr-3" />
            <h3 className="text-xl font-bold text-gray-900">{eventTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <p>Loading analytics data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Card: Total Tickets Sold */}
            <div className="bg-indigo-50 p-4 rounded-lg shadow-sm">
              <Ticket className="h-6 w-6 text-indigo-600 mb-2" />
              <p className="text-sm font-medium text-gray-500">Tickets Sold</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.totalTicketsSold.toLocaleString()}
              </p>
            </div>

            {/* Stat Card: Total Revenue */}
            <div className="bg-green-50 p-4 rounded-lg shadow-sm">
              <DollarSign className="h-6 w-6 text-green-600 mb-2" />
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.totalRevenue)}
              </p>
            </div>

            {/* Stat Card: Tickets Remaining */}
            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm">
              <Ticket className="h-6 w-6 text-yellow-600 mb-2" />
              <p className="text-sm font-medium text-gray-500">Tickets Left</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.ticketsAvailable.toLocaleString()}
              </p>
            </div>

            {/* Stat Card: Conversion Rate */}
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
              <BarChart3 className="h-6 w-6 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-gray-500">
                Conversion Rate
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {data.conversionRate}%
              </p>
            </div>

            {/* You would add more charts and detailed data tables here */}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
