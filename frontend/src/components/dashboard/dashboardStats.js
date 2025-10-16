// src/components/dashboard/DashboardStats.js

import { motion } from "framer-motion";

// This component expects the 'stats' array to be pre-calculated
export default function DashboardStats({ stats }) {
  // Check if stats is an array and has content before rendering
  if (!Array.isArray(stats) || stats.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 bg-white rounded-xl shadow-inner">
        No stats available yet. Create your first event!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label || index} // Use label for a better key if available
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="relative bg-white rounded-2xl shadow-lg border border-gray-100 p-6 overflow-hidden group hover:shadow-xl transition-all duration-300"
        >
          {/* Gradient background on hover */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
          ></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-105 transition-transform duration-300`}
              >
                {/* Note: stat.icon should be a Lucide-React component */}
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {stat.label}
              </p>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 truncate">{stat.subtext}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
