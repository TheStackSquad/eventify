// frontend/src/components/checkoutUI/customerForm.js
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone } from "lucide-react"; // Removed MapPin
// *** NEW: Import the validation utility ***
import { validateCustomerInfo } from "@/utils/validate/customerValidate";

export default function CustomerForm({
  onCustomerInfoChange,
  onValidationChange, // *** NEW PROP: To send validation status to parent ***
  initialData = {},
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    // address: "", // Removed as requested
    city: "",
    state: "",
    country: "Nigeria", // Fixed default value
  });

  // *** NEW STATE: To hold validation errors ***
  const [errors, setErrors] = useState({});

  // Prefill for authenticated users
  useEffect(() => {
    if (initialData.user) {
      const { name, email } = initialData.user;
      const [firstName, ...lastNameParts] = name?.split(" ") || [];
      const lastName = lastNameParts.join(" ") || "";

      setFormData((prev) => ({
        ...prev,
        firstName: firstName || "",
        lastName: lastName || "",
        email: email || "",
        // Removed address field from auto-fill logic
        ...initialData.additionalInfo,
      }));
    }
  }, [initialData]);

  // *** NEW EFFECT: Validate form whenever formData changes ***
  useEffect(() => {
    const { isValid, errors: newErrors } = validateCustomerInfo(formData);
    setErrors(newErrors);
    onValidationChange(isValid); // Communicate validity back to the parent page.js

    // Also send data up even if invalid, so parent can preview filled fields
    onCustomerInfoChange(formData);
  }, [formData, onValidationChange, onCustomerInfoChange]);

  // Handlers
  const handleChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    // Note: onCustomerInfoChange is now called inside the useEffect for consistency
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 ${
      errors[field] ? "border-red-500" : "border-gray-300"
    }`;

  const ErrorMessage = ({ field }) =>
    errors[field] ? (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-red-600 mt-1 font-medium"
      >
        {errors[field]}
      </motion.p>
    ) : null;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 flex items-center">
        <User className="mr-2" size={20} />
        Customer Information
      </h3>

      {/* Name Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            className={inputClass("firstName")}
            placeholder="John"
          />
          <ErrorMessage field="firstName" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            className={inputClass("lastName")}
            placeholder="Doe"
          />
          <ErrorMessage field="lastName" />
        </div>
      </div>

      {/* Contact Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Mail className="mr-1" size={16} />
            Email Address *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={inputClass("email")}
            placeholder="john.doe@example.com"
          />
          <ErrorMessage field="email" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Phone className="mr-1" size={16} />
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className={inputClass("phone")}
            placeholder="+234 800 000 0000"
          />
          <ErrorMessage field="phone" />
        </div>
      </div>

      {/* Removed Address section here */}

      {/* City & State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            className={inputClass("city")}
            placeholder="Lagos"
          />
          <ErrorMessage field="city" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State *
          </label>
          <select
            required
            value={formData.state}
            onChange={(e) => handleChange("state", e.target.value)}
            className={inputClass("state")}
          >
            <option value="">Select State</option>
            <option value="Lagos">Lagos</option>
            <option value="Abuja">Abuja</option>
            <option value="Rivers">Rivers</option>
            <option value="Kano">Kano</option>
            <option value="Oyo">Oyo</option>
            <option value="Edo">Edo</option>
            <option value="Delta">Delta</option>
            <option value="Kaduna">Kaduna</option>
            <option value="Ogun">Ogun</option>
            <option value="Enugu">Enugu</option>
          </select>
          <ErrorMessage field="state" />
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This information will be used for ticket
          delivery, receipts, and event communications. Email is required for
          digital ticket delivery.
        </p>
      </div>
    </div>
  );
}
