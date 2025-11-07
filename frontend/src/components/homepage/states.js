// frontend/src/components/homepage/states.js
"use client";

import React, { memo } from "react";

export const LoadingState = memo(() => (
  <section className="py-20 text-center text-gray-400 bg-gradient-to-b from-black via-gray-900 to-black">
    <p className="text-xl font-medium">Loading amazing events...</p>
  </section>
));
LoadingState.displayName = "LoadingState";

export const EmptyState = memo(() => (
  <section className="py-20 text-center text-gray-400 bg-gradient-to-b from-black via-gray-900 to-black">
    <p className="text-xl font-medium">
      No upcoming events found. Check back soon! 😔
    </p>
  </section>
));
EmptyState.displayName = "EmptyState";
