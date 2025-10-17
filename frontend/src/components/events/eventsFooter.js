//frontend/src/components/events/eventsFooter.js

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function EventsFooter({ hasMore, isLoading, onLoadMore }) {
  // In a real app, you would use an Intersection Observer to call onLoadMore
  // when the user scrolls this element into view.

  const handleLoadMoreClick = () => {
    if (!isLoading && hasMore) {
      // Simulate the Intersection Observer trigger
      onLoadMore();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="py-10 text-center font-body"
    >
      {isLoading ? (
        <div className="flex items-center justify-center text-blue-600">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          <span className="font-semibold">Loading more events...</span>
        </div>
      ) : hasMore ? (
        <button
          onClick={handleLoadMoreClick}
          className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold shadow-lg hover:bg-blue-700 transition duration-200 transform hover:scale-[1.03] active:scale-[0.98] font-body"
        >
          Load More Events
        </button>
      ) : (
        <p className="text-gray-500">
          You&apos;ve reached the end of the current event listings.
        </p>
      )}
    </motion.div>
  );
}
