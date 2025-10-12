// frontend/src/components/common/loading/loadingSpinner.jsx (Enhanced)
import React from "react";

const LoadingSpinner = ({
  message = "Loading...",
  subMessage = "Please wait...",
  size = "md",
  color = "indigo",
  className = "",
  fullScreen = true,
  showText = true,
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      spinner: "w-12 h-12",
      border: "border-2",
      text: "text-sm",
      subText: "text-xs",
    },
    md: {
      spinner: "w-16 h-16",
      border: "border-3",
      text: "text-base",
      subText: "text-sm",
    },
    lg: {
      spinner: "w-20 h-20",
      border: "border-4",
      text: "text-lg",
      subText: "text-base",
    },
    xl: {
      spinner: "w-24 h-24",
      border: "border-4",
      text: "text-xl",
      subText: "text-lg",
    },
  };

  // Color configurations
  const colorConfig = {
    indigo: {
      bg: "border-indigo-200",
      spinner: "border-t-indigo-600",
    },
    blue: {
      bg: "border-blue-200",
      spinner: "border-t-blue-600",
    },
    green: {
      bg: "border-green-200",
      spinner: "border-t-green-600",
    },
    red: {
      bg: "border-red-200",
      spinner: "border-t-red-600",
    },
  };

  const { spinner, border, text, subText } = sizeConfig[size];
  const { bg, spinner: spinnerColor } = colorConfig[color];

  const containerClasses = `
    flex items-center justify-center 
    ${fullScreen ? "min-h-screen" : "min-h-[200px]"}
    bg-gradient-to-br from-gray-50 to-gray-100
    ${className}
  `;

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Animated Spinner */}
        <div className={`relative ${spinner} mx-auto mb-4`}>
          {/* Background circle */}
          <div
            className={`absolute inset-0 ${border} ${bg} rounded-full`}
          ></div>
          {/* Animated spinner */}
          <div
            className={`absolute inset-0 ${border} ${spinnerColor} rounded-full animate-spin`}
          ></div>
        </div>

        {/* Loading Text */}
        {showText && (
          <>
            <h2 className={`font-bold text-gray-900 mb-2 ${text}`}>
              {message}
            </h2>
            <p className={`text-gray-600 ${subText}`}>{subMessage}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
