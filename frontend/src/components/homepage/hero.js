// src/components/homepage/hero.js
"use client";

import React from "react";
import Link from "next/link";
import Carousel from "@/components/homepage/carousel";

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-white via-gray-50 to-white pt-20 pb-28 md:pt-28 md:pb-36 lg:pb-44 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-100/30 rounded-full blur-3xl -translate-y-48 translate-x-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl translate-y-48 -translate-x-48 pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 z-10">
        {/* Hero Content - Two-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">
          {/* Left Column: Text & CTA */}
          <div className="flex-1 max-w-full lg:max-w-xl xl:max-w-2xl space-y-6 md:space-y-8 animate-fade-in-up order-2 lg:order-1">
            {/* Sign In Button with enhanced styling */}
            <div className="flex justify-start animate-fade-in-down">
              <a
                href="/account/login"
                className="group inline-flex items-center gap-2.5 px-6 py-3 md:px-7 md:py-3.5 text-sm md:text-base font-bold text-red-600 bg-gradient-to-r from-red-50 to-red-100 backdrop-blur-sm rounded-full shadow-lg shadow-red-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-red-300/60 hover:from-red-100 hover:to-red-200 active:scale-95 transform border border-red-200/80"
              >
                <svg
                  className="w-5 h-5 md:w-5 md:h-5 transition-transform duration-300 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-5.14 0-8 2.45-8 6h16c0-3.55-2.86-6-8-6z"
                  />
                </svg>
                <span className="tracking-wide">My Tickets / Sign In</span>
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
            {/* Main Heading with improved typography */}
            <h1 className="text-gray-900 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight">
              <span className="inline-block">Discover &</span>
              <br />
              <span className="inline-block mt-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Book Local Events
              </span>
            </h1>
            {/* Enhanced Description Card */}
            <div className="relative max-w-lg">
              <div className="relative bg-white/80 backdrop-blur-md p-6 md:p-7 rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/50">
                <p className="text-gray-700 text-base md:text-lg leading-relaxed font-medium">
                  Find concerts, workshops, festivals, and more. Get your
                  tickets instantly and never miss out on what&apos;s happening
                  nearby.
                </p>
                {/* Decorative accent */}
                <div className="absolute -top-2 -left-2 w-16 h-16 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-xl" />
              </div>
            </div>
            {/* Enhanced CTA Buttons */}
        
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 pt-2">
              {/* Button 1: Find Events */}
              <Link
                href="/events"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-base md:text-lg rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-red-700/50"
              >
                <span>Find Events Near You</span>
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>

              {/* Button 2: Browse Categories */}
              <Link
                href="/categories"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-800 font-bold text-base md:text-lg rounded-xl shadow-md bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Browse Categories</span>
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">Instant Booking</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">Secure Payment</span>
              </div>
            </div>
          </div>

          {/* Right Column: Carousel Container */}
          <div className="w-full lg:w-1/2 flex-shrink-0 animate-fade-in-right order-1 lg:order-2">
            <div className="relative bg-gradient-to-br from-pink-50 via-white to-blue-50 p-5 md:p-8 rounded-3xl shadow-2xl border border-gray-200/80">
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-red-500/20 to-transparent rounded-tl-3xl" />
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-blue-500/20 to-transparent rounded-br-3xl" />

              {/* Carousel with enforced minimum height and centered content */}
              <div
                className="relative overflow-hidden rounded-2xl
              shadow-2xl border border-white/50 min-h-[500px]
              sm:min-h-[450px] md:min-h-[500px]
              lg:min-h-[550px] mb-5 bg-gray-100"
              >
                <Carousel className="w-full h-full" />
              </div>

              {/* Optional: Feature badges */}
              <div
                className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3
  // START: Mobile adjustments for stacking and positioning
  flex-col sm:flex-row gap-2 sm:gap-3 bottom-0 sm:-bottom-4 left-0 sm:left-1/2
  transform sm:-translate-x-1/2 w-full sm:w-auto p-4 sm:p-0
  // END: Mobile adjustments
"
              >
                <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 text-xs font-bold text-gray-700 text-center">
                  🎉 1000+ Events
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 text-xs font-bold text-gray-700 text-center">
                  ⚡ Instant Tickets
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Animations */}
      {/* <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-fade-in-down {
          animation: fadeInDown 0.6s ease-out forwards;
        }

        .animate-fade-in-right {
          animation: fadeInRight 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
      `}</style> */}
    </section>
  );
}
