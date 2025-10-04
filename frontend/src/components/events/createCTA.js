//frontend/src/components/events/createCTA.js
'use client';
import React, { useState } from "react";
// import { PlusCircle } from "lucide-react";

// Mocking lucide-react icons for visual appeal
const PlusCircle = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);
const Search = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const User = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const LogIn = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" x2="3" y1="12" y2="12" />
  </svg>
);

// --- 1. Subcomponent: //src/components/events/createUserCTA.js ---
const CreateUserCTA = ({ onStartSignup }) => {
  return (
    <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 max-w-lg w-full">
      <User className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
      <h2 className="text-3xl font-bold text-white mb-2">
        Join the Event Platform
      </h2>
      <p className="text-indigo-200 mb-6">
        Sign up now to start discovering events or launching your own.
        Low-friction entry, flexible roles.
      </p>
      {/* This button redirects to //src/app/create-user/page.js */}
      <button
        onClick={onStartSignup}
        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-500 transition duration-300 transform hover:scale-[1.02]"
      >
        Create My Free Profile
      </button>
    </div>
  );
};

export default CreateUserCTA;
