// frontend/src/components/checkoutUI/customerForm.js

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone } from "lucide-react";
import { validateCustomerInfo } from "@/utils/validate/customerValidate";

// Nested component to display errors, now explicitly named to fix linting error
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
// Must set display name for a nested component if using a linter or for debugging
ErrorMessage.displayName = "CustomerFormErrorMessage";

export default function CustomerForm({
  onCustomerInfoChange,
  onValidationChange,
  // ❌ initialData prop is accepted but ignored for prefill purposes
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

  // ❌ REMOVED: initialDataLoaded ref
  // ❌ REMOVED: useEffect for prefilling authenticated user data

  // Memoize validation to avoid unnecessary recalculations
  const validationResult = useMemo(() => {
    const result = validateCustomerInfo(formData);
    // console.log("🔵 CustomerForm: Validation result", {
    //   isValid: result.isValid,
    //   errors: result.errors,
    //   formData,
    // });
    return result;
  }, [formData]);

  // Update parent components when validation or data changes
  useEffect(() => {
    setErrors(validationResult.errors);
    onValidationChange(validationResult.isValid);

    // CRITICAL: Always send current form data to parent
    // console.log("🔵 CustomerForm: Sending data to parent", formData);
    onCustomerInfoChange(formData);
  }, [validationResult, formData, onValidationChange, onCustomerInfoChange]);

  // Optimized change handler - batch state updates
  const handleChange = useCallback((field, value) => {
    // console.log(`🔵 CustomerForm: Field changed - ${field}:`, value);
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // console.log("🔵 CustomerForm: Updated form data", updated);
      return updated;
    });
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
            onBlur={() => handleBlur("firstName")}
            className={inputClass("firstName")}
            placeholder="John"
          />
          <ErrorMessage field="firstName" errors={errors} touched={touched} />
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
            onBlur={() => handleBlur("lastName")}
            className={inputClass("lastName")}
            placeholder="Doe"
          />
          <ErrorMessage field="lastName" errors={errors} touched={touched} />
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
            onBlur={() => handleBlur("email")}
            className={inputClass("email")}
            placeholder="john.doe@example.com"
          />
          <ErrorMessage field="email" errors={errors} touched={touched} />
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
            onBlur={() => handleBlur("phone")}
            className={inputClass("phone")}
            placeholder="+234 800 000 0000"
          />
          <ErrorMessage field="phone" errors={errors} touched={touched} />
        </div>
      </div>

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
            onBlur={() => handleBlur("city")}
            className={inputClass("city")}
            placeholder="Lagos"
          />
          <ErrorMessage field="city" errors={errors} touched={touched} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State *
          </label>
          <select
            required
            value={formData.state}
            onChange={(e) => handleChange("state", e.target.value)}
            onBlur={() => handleBlur("state")}
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
