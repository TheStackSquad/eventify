// src/components/common/inputField.js

import React from "react";
import { Eye, EyeOff } from "lucide-react";

export default function InputField({
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  error,
  isPassword = false,
  onToggleVisibility,
  showPassword,
  name,
  label, // Added label prop
}) {
  // step 1: Component definition: Define as a separate, exported component to prevent
  // re-creation by the parent (SignUpForm), thereby ensuring the input element
  // maintains focus and fixes the cursor bouncing issue.
  return (
    <div className="mb-4">
      {/* Label for accessibility */}
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1 font-body"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {/* Input Icon */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
          <Icon className="w-5 h-5" />
        </div>

        {/* Input Field */}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className={`w-full pl-12 pr-4 py-4 border rounded-2xl bg-white text-gray-800 focus:ring-green-500 focus:border-green-500 transition duration-150 shadow-sm ${
            error ? "border-red-300" : "border-gray-200"
          }`}
        />

        {/* Password Visibility Toggle Button */}
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

      {/* Error Message */}
      {error && <p className="mt-2 text-sm text-red-600 font-body">{error}</p>}
    </div>
  );
}
