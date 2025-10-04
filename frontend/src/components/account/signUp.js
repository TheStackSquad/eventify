//src / components / account / signUp.js;

"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { handleSignupSubmit } from "@/handler/signupHandler";
import { validateSignup } from "@/utils/validate/signupValidation";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function SignUpForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Validate form
      const validationErrors = validateSignup(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Clear previous errors
      setErrors({});

      // Submit form
      await handleSignupSubmit(formData, setErrors, setIsLoading, router);
    },
    [formData, router]
  );

  // Reusable Input Field Component
  const InputField = ({
    icon: Icon,
    type,
    value,
    onChange,
    placeholder,
    error,
    isPassword = false,
    onToggleVisibility,
    showPassword,
  }) => (
    <div className="mb-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
          <Icon className="w-5 h-5" />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className={`w-full pl-12 pr-4 py-4 border rounded-2xl bg-white text-gray-800 focus:ring-green-500 focus:border-green-500 transition duration-150 shadow-sm ${
            error ? "border-red-300" : "border-gray-200"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={onToggleVisibility}
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
      {error && <p className="mt-2 text-sm text-red-600 font-body">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Back Button */}
        {/* <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition duration-150 font-body"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button> */}

        {/* Sign Up Card */}
        <div className="w-full p-8 bg-white rounded-3xl shadow-2xl">
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-2 font-header">
            Create Account
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8 font-body">
            Create a new account to get started and enjoy{" "}
            <span className="text-green-600 cursor-pointer hover:underline">
              Read more about your features.
            </span>
          </p>

          {/* Error Message Display */}
          {errors.submit && (
            <div
              className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-xl border border-red-300"
              role="alert"
            >
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-1">
            {/* Name Input */}
            <InputField
              icon={User}
              type="text"
              value={formData.name}
              onChange={(value) => handleInputChange("name", value)}
              placeholder="Name"
              error={errors.name}
            />

            {/* Email Input */}
            <InputField
              icon={Mail}
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange("email", value)}
              placeholder="Email address"
              error={errors.email}
            />

            {/* Password Input */}
            <InputField
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(value) => handleInputChange("password", value)}
              placeholder="Password"
              error={errors.password}
              isPassword={true}
              onToggleVisibility={togglePasswordVisibility}
              showPassword={showPassword}
            />

            {/* Confirm Password Input */}
            <InputField
              icon={Lock}
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(value) => handleInputChange("confirmPassword", value)}
              placeholder="Confirm Password"
              error={errors.confirmPassword}
              isPassword={true}
              onToggleVisibility={toggleConfirmPasswordVisibility}
              showPassword={showConfirmPassword}
            />

            {/* Create Account Button */}
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
                "Create Account"
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="text-center mt-6 font-body">
            Already have an account?
            <a
              href="/account/login"
              className="ml-1 text-green-600 hover:text-green-700 font-semibold transition"
            >
              Sign in here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}