// frontend/src/components/onboarding/onboardingCTA.js
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
// 🎯 Import framer-motion components
import { motion } from "framer-motion";

// Framer Motion Variants for Staggered Entrance
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1, // Stagger effect
      when: "beforeChildren",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function OnboardingCTA() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  // 🎯 Note: The Image component here uses 'priority'. If this component is NOT
  // the largest element in the viewport, remove 'priority' to improve LCP.
  // We'll keep it for now assuming it's a key visible block.

  const handleStartSignup = () => {
    // 💡 The user explicitly removed email verification logic from signup.
    // The link remains the same:
    router.push("/account/auth/create-account");
  };

  return (
    // 1. Use motion.div for the main container and apply stagger variants
    <motion.div
      className="w-full max-w-5xl mx-auto relative group"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 2. Enhanced Border Accent (Replaces the blurry animated glow) */}
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-indigo-500/80 to-purple-500/80 opacity-0 group-hover:opacity-60 transition duration-500 animate-in-out">
        <div className="absolute inset-0.5 bg-gray-900 rounded-3xl"></div>
      </div>

      <motion.div
        className="relative bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-700/50"
        variants={itemVariants} // This item gets the first animation
      >
        {/* Left Section: Enhanced Image with Overlay Effects */}
        <div className="md:w-1/2 relative min-h-[300px] md:min-h-full overflow-hidden">
          <Image
            src="/img/ticket/ticket.avif"
            alt="Close-up of event tickets and a festival atmosphere"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
            priority // Keep priority if this is the LCP image
            className="brightness-75 group-hover:scale-105 transition-transform duration-700"
          />

          {/* Gradient overlays for depth (kept subtle) */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

          {/* Shimmer/Particles: Simplified and used subtle coloring/opacity */}
          <div className="absolute top-6 right-6 px-3 py-1.5 bg-indigo-600/70 backdrop-blur-sm rounded-lg shadow-lg">
            <p className="text-xs text-white font-semibold">10K+ Events</p>
          </div>
          <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/70 backdrop-blur-md rounded-xl border border-indigo-500/30 shadow-lg">
            <p className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-widest font-bold">
              ✨ Eventify
            </p>
          </div>
        </div>

        {/* Right Section: Enhanced Content and CTA */}
        <div className="md:w-1/2 p-8 md:p-12 space-y-6 flex flex-col justify-center relative">
          {/* Background accent: Replaced blurry glow with sharp inset shadow for clean look */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl [box-shadow:inset_0_0_100px_rgba(20,20,30,0.8),inset_0_0_50px_rgba(40,40,60,0.7)]" />

          <div className="relative z-10 space-y-6">
            {/* Small badge above heading */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full w-fit"
              variants={itemVariants}
            >
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
              <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wide">
                Start Free Today
              </span>
            </motion.div>

            {/* Heading with gradient text */}
            <motion.h1
              className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300 leading-tight"
              variants={itemVariants}
            >
              Unlock Your Events,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Your Way
              </span>
            </motion.h1>

            {/* Body text with better spacing */}
            <motion.p
              className="text-lg text-gray-300 leading-relaxed"
              variants={itemVariants}
            >
              Join Eventify now to{" "}
              <span className="text-indigo-300 font-semibold">
                create and sell tickets
              </span>{" "}
              for your next big event, or simply{" "}
              <span className="text-purple-300 font-semibold">
                find events, secure discounts,
              </span>{" "}
              and get personalized updates on the hottest gatherings near you!
            </motion.p>

            {/* Feature highlights: Staggered effect applied to the parent */}
            <motion.div
              className="flex flex-wrap gap-3 pt-2"
              variants={itemVariants} // Use itemVariants to stagger the entire block
            >
              {/* Feature 1 */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>No fees to start</span>
              </div>
              {/* Feature 2 */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Instant setup</span>
              </div>
              {/* Feature 3 */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Full access</span>
              </div>
            </motion.div>

            {/* CTA Button with enhanced effects */}
            <motion.div className="space-y-3 pt-2" variants={itemVariants}>
              <button
                onClick={handleStartSignup}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 transform hover:scale-[1.02] overflow-hidden group/btn"
              >
                {/* Button shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>

                <span className="relative flex items-center justify-center gap-2">
                  Create My Free Profile
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 ${
                      isHovered ? "translate-x-1" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </button>

              <p className="text-sm text-center text-gray-400 flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                All perks and dashboard access. No credit card required.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
