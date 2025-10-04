// src/components/account/loginForm.js

"use client"; // CRITICAL: Marks this file as a Client Component

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { handleLoginSubmit } from "@/handler/loginHandler";
import { Mail, Lock, Eye, EyeOff, Facebook, Apple } from "lucide-react";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Delegate all logic (validation, API call, redirection) to the handler
      await handleLoginSubmit(
        { email, password }, // Credentials
        setError, // State setter for errors
        setIsLoading, // State setter for loading
        router // Next.js Router for redirection
      );
    },
    [email, password, router]
  );

  // Reusable Input Field Component
  const InputField = ({
    icon: Icon,
    type,
    value,
    onChange,
    placeholder,
    isPassword = false,
  }) => (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
        <Icon className="w-5 h-5" />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-white text-gray-800 focus:ring-green-500 focus:border-green-500 transition duration-150 shadow-sm"
      />
      {isPassword && (
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-green-600 transition"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-2xl">
      <h1 className="text-4xl font-bold text-gray-900 text-center mb-2 font-header">
        Log in
      </h1>
      <p className="text-sm text-gray-500 text-center mb-8 font-body">
        Enter your email and password to securely access your account and manage
        your services.
      </p>

      {/* Error Message Display */}
      {error && (
        <div
          className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-xl border border-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Address Input */}
        <InputField
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />

        {/* Password Input */}
        <InputField
          icon={Lock}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          isPassword={true}
        />

        {/* Checkbox and Forgot Password */}
        <div className="flex items-center justify-between pt-1 text-sm">
          <label className="flex items-center space-x-2 text-gray-600 cursor-pointer select-none font-body">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
            />
            <span>Remember me</span>
          </label>
          <a
            href="#"
            className="text-green-600 hover:text-green-700 font-medium font-body transition duration-150"
          >
            Forgot Password
          </a>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 mt-6 text-lg font-semibold text-white rounded-full transition duration-300 shadow-lg ${
            isLoading
              ? "bg-green-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          } flex items-center justify-center font-body`}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            "Login"
          )}
        </button>
      </form>

      {/* Sign Up Link */}
      <div className="text-center mt-6 font-body">
        Don&apos;t have an account?
        <Link
          href="/account/create-account"
          className="ml-1 text-green-600 hover:text-green-700 font-semibold transition"
        >
          Sign Up here
        </Link>
      </div>
    </div>
  );
}
