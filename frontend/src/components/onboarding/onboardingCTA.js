// frontend/src/components/onboarding/onboardingCTA.js
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingCTA() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleStartSignup = () => {
    router.push("/account/auth/create-account");
  };

  return (
    <div className="w-full max-w-5xl mx-auto relative group">
      {/* Animated gradient glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500 animate-pulse"></div>

      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-700/50">
        {/* Left Section: Enhanced Image with Overlay Effects */}
        <div className="md:w-1/2 relative min-h-[300px] md:min-h-full overflow-hidden">
          <Image
            src="/img/ticket/ticket.avif"
            alt="Close-up of event tickets and a festival atmosphere"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
            priority
            className="brightness-75 group-hover:scale-105 transition-transform duration-700"
          />

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/30 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

          {/* Floating particles effect */}
          <div className="absolute top-10 left-10 w-2 h-2 bg-indigo-400 rounded-full animate-ping opacity-75"></div>
          <div
            className="absolute top-20 right-16 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping opacity-60"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="absolute bottom-16 left-20 w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-50"
            style={{ animationDelay: "1s" }}
          ></div>

          {/* Enhanced brand badge */}
          <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/70 backdrop-blur-md rounded-xl border border-indigo-500/30 shadow-lg">
            <p className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-widest font-bold">
              ✨ Eventify
            </p>
          </div>

          {/* Stats badge */}
          <div className="absolute top-6 right-6 px-3 py-1.5 bg-indigo-600/90 backdrop-blur-md rounded-lg shadow-lg">
            <p className="text-xs text-white font-semibold">10K+ Events</p>
          </div>
        </div>

        {/* Right Section: Enhanced Content and CTA */}
        <div className="md:w-1/2 p-8 md:p-12 space-y-6 flex flex-col justify-center relative">
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 space-y-6">
            {/* Small badge above heading */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full w-fit">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
              <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wide">
                Start Free Today
              </span>
            </div>

            {/* Heading with gradient text */}
            <h1
              className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300 leading-tight"
              style={{
                fontFamily: "var(--font-jakarta-sans), system-ui, sans-serif",
              }}
            >
              Unlock Your Events,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Your Way
              </span>
            </h1>

            {/* Body text with better spacing */}
            <p
              className="text-lg text-gray-300 leading-relaxed"
              style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
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
            </p>

            {/* Feature highlights */}
            <div className="flex flex-wrap gap-3 pt-2">
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
            </div>

            {/* CTA Button with enhanced effects */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleStartSignup}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 transform hover:scale-[1.02] overflow-hidden group/btn"
                style={{
                  fontFamily: "var(--font-onest), system-ui, sans-serif",
                }}
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

              <p
                className="text-sm text-center text-gray-400 flex items-center justify-center gap-2"
                style={{
                  fontFamily: "var(--font-onest), system-ui, sans-serif",
                }}
              >
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
