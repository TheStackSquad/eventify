// src/components/common/loginInputFields.js
import React from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export const LoginInputField = React.memo(
  ({
    icon: Icon,
    type,
    value,
    onChange,
    placeholder,
    isPassword = false,
    showPassword = false,
    togglePasswordVisibility,
  }) => (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
        <Icon className="w-5 h-5" />
      </div>
      <input
        // Use the resolved type: 'text' or 'password'
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
  )
);

LoginInputField.displayName = "LoginInputField";
