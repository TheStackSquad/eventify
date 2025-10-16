// src/components/account/signUp.js;

"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { signupUser } from "@/redux/action/actionAuth";
import  toastAlert  from "@/components/common/toast/toastAlert";
import { validateSignup } from "@/utils/validate/signupValidation";
// step 1: Import the newly separated InputField component
import InputField from "@/components/common/inputFields";
import { User, Mail, Lock } from "lucide-react"; // Only need the field icons here

export default function SignUpForm() {
  const dispatch = useDispatch();
  const router = useRouter();

  // step 2: State initialization
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

  // step 3: Define utility functions using useCallback for optimization
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  // step 4: Define the core input change handler using useCallback
  const handleInputChange = useCallback(
    (field, value) => {
      // 4.1 Update form data
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // 4.2 Clear field error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }
    },
    [errors] // errors is in dependency array to correctly check for and clear errors
  );

  // step 5: Define the main form submission function using useCallback
 const handleSubmit = useCallback(
   async (e) => {
     e.preventDefault();
     console.log("LOG 1: handleSubmit called.");
     console.log("LOG 2: Initial formData state:", formData); // Trace the data being submitted
     setIsLoading(true);

     // 5.1. Validate form
     const validationErrors = validateSignup(formData);

     if (Object.keys(validationErrors).length > 0) {
       console.log("LOG 3: Form validation FAILED. Errors:", validationErrors);
       setErrors(validationErrors);
       setIsLoading(false);
       return;
     }

     console.log("LOG 3: Form validation PASSED.");
     setErrors({}); // Clear previous server errors

     try {
       // 5.2. Dispatch the Thunk and await the result
       console.log("LOG 4: Dispatching signupUser thunk with formData.");

       // Note: formData should be checked in the 'signupUser' thunk for the actual API payload
       await dispatch(signupUser(formData)).unwrap();

       // 5.3. Success Handling
       console.log("LOG 5: Thunk successful. User signed up."); // Data flow ends here for success
      // toastAlert.success("Signup successful! Redirecting to login.");
       router.push("/account/auth/login?signup=success");
     } catch (error) {
       // 5.4. Error Handling
       console.error("LOG 5: Thunk FAILED. Error details:", error); // Data flow ends here for error
       const errorMessage = error.message || "An unexpected error occurred.";
       setErrors({ submit: errorMessage });
       toastAlert.error(errorMessage);
     } finally {
       console.log("LOG 6: Finalizing submission. Setting isLoading to false.");
       setIsLoading(false); // Stop loading regardless of outcome
     }
   },
   [formData, router, dispatch]
 );

  // step 6: Render the Sign Up Form with imported InputField components
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-2 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
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
            {/* 6.1. Name Input */}
            <InputField
              label="Full Name"
              name="name"
              icon={User}
              type="text"
              value={formData.name}
              onChange={(value) => handleInputChange("name", value)}
              placeholder="Name"
              error={errors.name}
            />

            {/* 6.2. Email Input */}
            <InputField
              label="Email Address"
              name="email"
              icon={Mail}
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange("email", value)}
              placeholder="Email address"
              error={errors.email}
            />

            {/* 6.3. Password Input */}
            <InputField
              label="Password"
              name="password"
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

            {/* 6.4. Confirm Password Input */}
            <InputField
              label="Confirm Password"
              name="confirmPassword"
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

            {/* 6.5. Create Account Button */}
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

          {/* 6.6. Sign In Link */}
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
