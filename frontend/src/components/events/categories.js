//src/components/events/categories.js

import React from "react";
import Link from "next/link";

// Mock data for event categories
const categoriesData = [
  {
    id: 1,
    name: "Music Festivals",
    icon: "M9 12h6M9 16h6M9 20h6M12 4v4m0 0l-4 4m4-4l4 4",
    color: "bg-indigo-500",
    href: "/events?cat=music",
  },
  {
    id: 2,
    name: "Sports & Fitness",
    icon: "M12 11c0 2.76-2.24 5-5 5S2 13.76 2 11c0-2.76 2.24-5 5-5s5 2.24 5 5zm-5 5v4m0 0l-2-2m2 2l2-2",
    color: "bg-green-500",
    href: "/events?cat=sports",
  },
  {
    id: 3,
    name: "Tech & Conference",
    icon: "M14 6H9c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM12 18h.01",
    color: "bg-blue-500",
    href: "/events?cat=tech",
  },
  {
    id: 4,
    name: "Arts & Culture",
    icon: "M13 19c0 1.1-.9 2-2 2s-2-.9-2-2V5.5c0-.83-.67-1.5-1.5-1.5S6 4.67 6 5.5V17m5-12h2l-2-2v2h2",
    color: "bg-yellow-500",
    href: "/events?cat=art",
  },
  {
    id: 5,
    name: "Food & Drink",
    icon: "M17 10h-2M17 14h-2M15 12h-2m-4 0v-4h2V8M7 16h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2z",
    color: "bg-red-500",
    href: "/events?cat=food",
  },
  {
    id: 6,
    name: "Family Fun",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-2V9h4v8z",
    color: "bg-pink-500",
    href: "/events?cat=family",
  },
  {
    id: 7,
    name: "Education",
    icon: "M2 17l10 5 10-5M2 12l10 5 10-5M12 2l10 5-10 5-10-5z",
    color: "bg-teal-500",
    href: "/events?cat=education",
  },
  {
    id: 8,
    name: "Travel & Outdoors",
    icon: "M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-1c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 3.19 2.05 5.86 4.9 6.73L12 22l3.1-4.27c2.85-.87 4.9-3.54 4.9-6.73z",
    color: "bg-orange-500",
    href: "/events?cat=travel",
  },
];

// Helper component for a single category card
const CategoryCard = ({ category }) => {
  return (
    <Link
      href={category.href}
      className={`relative flex flex-col items-center justify-center p-4 h-32 md:h-40 rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] group overflow-hidden cursor-pointer
        ${category.color}
      `}
    >
      <div
        className={`absolute inset-0 opacity-20 transition-opacity duration-300 group-hover:opacity-10`}
      >
        {/* Subtle background overlay */}
      </div>

      {/* Icon */}
      <div
        className={`p-3 md:p-4 rounded-full bg-white/30 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/40`}
      >
        <svg
          className="w-8 h-8 md:w-10 md:h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d={category.icon}
          />
        </svg>
      </div>

      {/* Name */}
      <p className="mt-3 text-sm md:text-lg font-bold text-white text-center drop-shadow-md">
        {category.name}
      </p>
    </Link>
  );
};

// Main categories component
const CategoriesComponent = () => {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 md:mb-10 text-center">
          Explore Event Categories
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categoriesData.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoriesComponent;
