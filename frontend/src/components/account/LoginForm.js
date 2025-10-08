// src/components/account/loginForm.js

"use client"; // CRITICAL: Marks this file as a Client Component

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Facebook, Apple } from "lucide-react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { LoginInputField } from "@/components/common/loginInputFields";
import { signinUser } from "@/redux/action/actionAuth";

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch();

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
      setError("");
      setIsLoading(true);

      try {
        // Dispatch the Redux Thunk action to handle login and state updates
        const resultAction = await dispatch(
          signinUser({ email, password })
        ).unwrap();

        // On successful unwrap (no error thrown by rejectWithValue)
        router.push("/dashboard");
      } catch (rejectedValue) {
        // Error handling from the Redux Thunk (e.g., "Invalid credentials")
        const message =
          rejectedValue.message ||
          "Login failed due to a network or server error.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, dispatch, router]
  );

  // NOTE: The 'InputField' component definition has been removed and replaced
  // with the import of 'LoginInputField' above to fix the re-rendering issue.

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
        {/* Email Address Input - Uses imported LoginInputField */}
        <LoginInputField
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />

        {/* Password Input - Uses imported LoginInputField */}
        <LoginInputField
          icon={Lock}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          isPassword={true}
          showPassword={showPassword}
          togglePasswordVisibility={togglePasswordVisibility}
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
          href="/account/auth/create-account"
          className="ml-1 text-green-600 hover:text-green-700 font-semibold transition"
        >
          Sign Up here
        </Link>
      </div>
    </div>
  );
}
