//frontend/src/components/dashboard/dashboardSwitcher.js

"use client";

import { motion, AnimatePresence } from "framer-motion";
import MyEventsDashboard from "@/components/dashboard/eventComponents/myEventsDashboard";
import VendorsDashboard from "@/components/dashboard/vendorComponents/vendorDashboard";
import { XCircle } from "lucide-react";

export default function DashboardSwitcher({
  activeView,
  user,
  events,
  isLoading,
  eventsError,
  openDeleteModal,
  openAnalyticsModal,
  onCreateEvent,
  refetchUserEvents,
}) {
  // Error state scoped to the content area
  if (eventsError && activeView === "events") {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Connection Error</h3>
        <button onClick={refetchUserEvents} className="mt-4 text-indigo-600">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView} // Triggers animation on switch
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="p-6 lg:p-10"
      >
        {activeView === "events" && (
          <MyEventsDashboard
            events={events}
            isLoading={isLoading}
            onCreateEvent={onCreateEvent}
            openDeleteModal={openDeleteModal}
            openAnalyticsModal={openAnalyticsModal}
          />
        )}

        {(activeView === "vendor" || activeView === "vendor-register") && (
          <VendorsDashboard activeView={activeView} user={user} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}