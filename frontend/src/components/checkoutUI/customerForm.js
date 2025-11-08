// frontend/src/components/checkoutUI/customerForm.js
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone } from "lucide-react";
// Assuming this path is correct:
import { validateCustomerInfo } from "@/utils/validate/customerValidate";

// Nested component to display errors
const ErrorMessage = ({ field, errors, touched }) =>
  errors[field] && touched[field] ? (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-red-600 mt-1 font-medium"
    >
      {errors[field]}
    </motion.p>
  ) : null;
ErrorMessage.displayName = "CustomerFormErrorMessage";

export default function CustomerForm({
  onCustomerInfoChange,
  onValidationChange,
  // Accepted but unused initialData prop kept for context
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "Nigeria",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Memoize validation to avoid unnecessary recalculations
  const validationResult = useMemo(() => {
    return validateCustomerInfo(formData);
  }, [formData]);

  // Update parent components when validation or data changes
  useEffect(() => {
    setErrors(validationResult.errors);
    onValidationChange(validationResult.isValid);
    onCustomerInfoChange(formData);
  }, [validationResult, formData, onValidationChange, onCustomerInfoChange]);

  // Optimized change handler - batch state updates
  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Track field blur for showing errors only after user interaction
  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Memoize input class calculation
  const inputClass = useCallback(
    (field) =>
      `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 ${
        errors[field] && touched[field] ? "border-red-500" : "border-gray-300"
      }`,
    [errors, touched]
  );

  // Array of Nigerian states for dropdown
  const NigerianStates = [
    "Lagos", "Abuja", "Rivers", "Kano", "Oyo", "Edo", "Delta", "Kaduna", "Ogun", "Enugu",
    // ... add all 36 states if required for a complete list
  ];
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 flex items-center">
        <User className="mr-2" size={20} data-testid="user-icon" />
        Customer Information
      </h3>

      {/* Name Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {/* FIX: Added htmlFor attribute */}
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            onBlur={() => handleBlur("firstName")}
            className={inputClass("firstName")}
            placeholder="John"
            // Adding a test ID for robust selection in tests where label text is complex
            data-testid="input-firstName" 
          />
          <ErrorMessage field="firstName" errors={errors} touched={touched} />
        </div>
        <div>
          {/* FIX: Added htmlFor attribute */}
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            onBlur={() => handleBlur("lastName")}
            className={inputClass("lastName")}
            placeholder="Doe"
            data-testid="input-lastName"
          />
          <ErrorMessage field="lastName" errors={errors} touched={touched} />
        </div>
      </div>

      {/* Contact Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {/* FIX: Added htmlFor attribute */}
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Mail className="mr-1" size={16} data-testid="mail-icon" />
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            className={inputClass("email")}
            placeholder="john.doe@example.com"
            data-testid="input-email"
          />
          <ErrorMessage field="email" errors={errors} touched={touched} />
        </div>
        <div>
        
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Phone className="mr-1" size={16} data-testid="phone-icon" />
            Phone Number *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            onBlur={() => handleBlur("phone")}
            className={inputClass("phone")}
            placeholder="+234 800 000 0000"
            data-testid="input-phone"
          />
          <ErrorMessage field="phone" errors={errors} touched={touched} />
        </div>
      </div>

      {/* City & State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {/* FIX: Added htmlFor attribute */}
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            onBlur={() => handleBlur("city")}
            className={inputClass("city")}
            placeholder="Lagos"
            data-testid="input-city"
          />
          <ErrorMessage field="city" errors={errors} touched={touched} />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
            State *
          </label>
          <select
            id="state"
            name="state"
            required
            value={formData.state}
            onChange={(e) => handleChange("state", e.target.value)}
            onBlur={() => handleBlur("state")}
            className={inputClass("state")}
            data-testid="select-state"
          >
            <option value="">Select State</option>
            {NigerianStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <ErrorMessage field="state" errors={errors} touched={touched} />
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