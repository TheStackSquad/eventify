// src/components/homepage/carousel.js
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { heroImages } from "@/data/heroImages";

export default function Carousel({ className = "" }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Set the interval for a subtle, unnoticeable transition every 30 seconds
    const intervalId = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % heroImages.length);
    }, 30000); // 30,000 milliseconds = 30 seconds

    // Cleanup the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  return (

    <div
      className={`relative overflow-hidden min-h-[65vh] sm:min-h-[70vh] md:min-h-[75vh] lg:min-h-0 ${className}`}
    >
      {heroImages.map((image, index) => (
        <Image
          key={image.path}
          src={image.path}
          alt={image.alt}
          fill
          priority={index === 0}
          sizes="100vw"
          className="object-cover transition-opacity duration-3000 ease-in-out"
          style={{
            opacity: index === currentSlide ? 1 : 0,
            transitionDuration: "3000ms",
          }}
        />
      ))}

      {/* Enhanced overlay with subtle gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50 z-[1]"></div>

      {/* Optional: Slide indicators for better UX */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[2] flex gap-2">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentSlide
                ? "w-8 h-2 bg-white"
                : "w-2 h-2 bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
