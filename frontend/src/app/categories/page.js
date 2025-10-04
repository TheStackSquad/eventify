//src/app/categories/page.js

import React from "react";
import Link from "next/link";
import CategoriesComponent from "@/components/events/categories";

const CategoriesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/">
            <h1 className="text-xl font-bold text-gray-800 hover:text-gray-600 transition-colors cursor-pointer">
              Bandhit
            </h1>
          </Link>
          <div className="text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600 transition">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-16 pt-8">
        <CategoriesComponent />
      </main>

      <footer className="bg-gray-800 text-white p-6 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm">
          © 2025 Bandhit. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default CategoriesPage;