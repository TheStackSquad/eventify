// frontend/src/components/vendorUI/vendorForm.js
"use client";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Mail, Briefcase, DollarSign, MapPin } from "lucide-react"; // Icons for form fields
import { createInputField } from "@/components/common/createInputFields";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import { vendorRegistrationValidate } from "@/utils/validate/vendorValidate";
import { registerVendor } from "@/redux/action/vendorAction";
import { STATUS } from "@/utils/constants/globalConstants";

// Dummy data for select fields (replace with actual API/constant data later)
const CATEGORIES = [
  { value: "", label: "Select Category" },
  { value: "caterer", label: "Caterer / Food Vendor" },
  { value: "decorator", label: "Event Decorator" },
  { value: "photographer", label: "Photographer / Videographer" },
];

const STATES = [
  { value: "", label: "Select State" },
  { value: "Lagos", label: "Lagos" },
  { value: "Abuja FCT", label: "Abuja FCT" },
  { value: "Rivers", label: "Rivers" },
];

const VendorForm = () => {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.vendors.status); // Assuming the status is available on the vendors slice
  const error = useSelector((state) =>
    status === STATUS.FAILED ? state.vendors.error : null
  );

  const isLoading = status === STATUS.LOADING;

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    state: "",
    city: "",
    phoneNumber: "",
    minPrice: "",
    imageURL: "", // Placeholder for future image upload logic
  });
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear specific error on change
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = vendorRegistrationValidate(formData);
    setFormErrors(validationErrors);

    // If there are validation errors, stop the submission
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Prepare data for dispatching (convert minPrice to integer)
    const dataToSubmit = {
      ...formData,
      minPrice: parseInt(formData.minPrice, 10),
    };

    // Dispatch the Redux thunk
    // Note: The thunk (registerVendor) handles success/error toasts
    dispatch(registerVendor(dataToSubmit))
      .unwrap()
      .then(() => {
        // Success: Optionally reset the form after successful submission
        setFormData({
          name: "",
          category: "",
          state: "",
          city: "",
          phoneNumber: "",
          minPrice: "",
          imageURL: "",
        });
        setFormErrors({});
      })
      .catch(() => {
        // Error is already handled by the thunk and Redux state.
      });
  };

  // Function to create a standard input field using the reusable helper
  const InputField = ({ icon: Icon, ...props }) => (
    <div className="relative">
      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
        <Icon size={20} />
      </span>
      {createInputField({
        ...props,
        className: "pl-12", // Add padding for the icon
      })}
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-lg p-8 bg-white rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-2 font-header">
          Register Your Service
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8 font-body">
          Join Eventify to connect with thousands of event planners across
          Nigeria.
        </p>

        {/* Error Message Display (from Redux) */}
        {error && (
          <div
            className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-xl border border-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Business Name */}
          <InputField
            icon={Briefcase}
            label="Business Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Johnson Catering Services"
            error={formErrors.name}
            required={true}
          />

          {/* 2. Category Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Briefcase size={20} />
              </span>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-gray-100 border rounded-lg text-gray-800 appearance-none focus:ring-2 focus:ring-green-500 focus:border-transparent pl-12 ${
                  formErrors.category ? "border-red-500" : "border-gray-300"
                }`}
              >
                {CATEGORIES.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.value === ""}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.category && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors.category}
                </p>
              )}
            </div>
          </div>

          {/* 3. State Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary State *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <MapPin size={20} />
              </span>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-gray-100 border rounded-lg text-gray-800 appearance-none focus:ring-2 focus:ring-green-500 focus:border-transparent pl-12 ${
                  formErrors.state ? "border-red-500" : "border-gray-300"
                }`}
              >
                {STATES.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.value === ""}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.state && (
                <p className="text-red-500 text-sm mt-1">{formErrors.state}</p>
              )}
            </div>
          </div>

          {/* 4. City Input (Optional/Area) */}
          <InputField
            icon={MapPin}
            label="City/Area (e.g., Lekki Phase 1, Wuse 2)"
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City or Area"
            error={formErrors.city}
          />

          {/* 5. Minimum Price */}
          <InputField
            icon={DollarSign}
            label="Starting Price (in NGN)"
            type="number"
            name="minPrice"
            value={formData.minPrice}
            onChange={handleChange}
            placeholder="e.g., 50000 (no commas)"
            error={formErrors.minPrice}
            required={true}
            min="1000"
          />

          {/* 6. Phone Number */}
          <InputField
            icon={Mail}
            label="Phone Number"
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="e.g., 080XXXXXXXXX"
            error={formErrors.phoneNumber}
          />

          {/* Registration Button */}
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
              // Using a simple loading spinner here, but you can integrate your enhanced one
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" showText={false} color="white" />
                <span>Registering...</span>
              </div>
            ) : (
              "Submit Registration"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VendorForm;
