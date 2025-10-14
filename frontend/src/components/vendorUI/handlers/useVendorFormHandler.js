//frontend/src/components/vendorUI/handlers/useVendorFormHandler.js

import React from "react";
import { PRICE_RANGES } from "@/data/vendorData";

export const useVendorFormHandler = ({ vendorId, onSuccess }) => {
  const isEditMode = !!vendorId;

  // 1. State Management
  const [formData, setFormData] = React.useState({
    name: "",
    category: "",
    state: "",
    city: "",
    minPrice: "",
    phoneNumber: "",
  });
  const [imageFile, setImageFile] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [formErrors, setFormErrors] = React.useState({}); // For field-specific validation errors
  const [isLoadingVendor, setIsLoadingVendor] = React.useState(false);

  // 2. Mock Data Fetching (Simulate loading existing vendor data in edit mode)
  React.useEffect(() => {
    if (isEditMode) {
      setIsLoadingVendor(true);
      setError(null);

      // Mock API call to fetch existing vendor data
      setTimeout(() => {
        const mockVendorData = {
          name: "Elite Event Decor Ltd.",
          category: "Decorations",
          state: "Lagos",
          city: "Lekki Phase 1",
          minPrice: "150000",
          phoneNumber: "08012345678",
        };
        setFormData(mockVendorData);
        // Note: Image file retrieval is complex, so we'll leave imageFile as null for the mock
        setIsLoadingVendor(false);
      }, 1000);
    }
  }, [isEditMode, vendorId]);

  // 3. Handlers

  /** Handles standard input change for text, number, and select fields. */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Basic price validation: ensure it's a number and within bounds
    if (name === "minPrice" && value !== "") {
      const numValue = Number(value);
      if (
        isNaN(numValue) ||
        numValue < PRICE_RANGES.MIN ||
        numValue > PRICE_RANGES.MAX
      ) {
        // Set a temporary field error but allow state change for user feedback
        setFormErrors((prev) => ({
          ...prev,
          [name]: "Price must be between ₦1,000 and ₦100,000,000.",
        }));
      } else {
        setFormErrors((prev) => ({ ...prev, [name]: "" }));
      }
    } else if (name === "minPrice" && value === "") {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "Starting price is required.",
      }));
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null); // Clear global error on any change
  };

  /** Handles file input change for the business image. */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic file validation (Max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors((prev) => ({
          ...prev,
          imageURL: "File size exceeds 5MB limit.",
        }));
        setImageFile(null);
      } else {
        setImageFile(file);
        setFormErrors((prev) => ({ ...prev, imageURL: "" }));
      }
    }
    if (error) setError(null);
  };

  /** Simple client-side validation check */
  const validateForm = () => {
    let errors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = "Business name is required.";
      isValid = false;
    }
    if (!formData.category) {
      errors.category = "Service category is required.";
      isValid = false;
    }
    if (!formData.state) {
      errors.state = "Primary service state is required.";
      isValid = false;
    }

    // Basic check for Nigerian phone number format (0XX-XXX-XXXX)
    if (!formData.phoneNumber.match(/^0[789][01]\d{8}$/)) {
      errors.phoneNumber =
        "Valid Nigerian phone number (11 digits, starts with 0) is required.";
      isValid = false;
    }

    const minPriceNum = Number(formData.minPrice);
    if (isNaN(minPriceNum) || minPriceNum < PRICE_RANGES.MIN) {
      errors.minPrice = `Minimum price must be at least ₦${PRICE_RANGES.MIN.toLocaleString()}.`;
      isValid = false;
    }

    // Image is only required for new registration
    if (!isEditMode && !imageFile) {
      errors.imageURL = "A business image is required for new registration.";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  /** Handles form submission (Registration or Update). */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please correct the highlighted fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    console.log(
      `[SUBMIT] Attempting ${isEditMode ? "Update" : "Registration"} for:`,
      formData
    );

    try {
      // --- MOCK API CALL SIMULATION ---
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock failure condition if name contains 'fail'
      if (formData.name.toLowerCase().includes("fail")) {
        throw new Error("Simulated network failure. Check your connection.");
      }

      // Success condition
      console.log("[SUBMIT] Submission successful!");
      if (onSuccess) onSuccess(); // Notify parent component

      // Clear form only after successful registration, not update
      if (!isEditMode) {
        setFormData({
          name: "",
          category: "",
          state: "",
          city: "",
          minPrice: "",
          phoneNumber: "",
        });
        setImageFile(null);
        setFormErrors({});
      }
    } catch (err) {
      console.error("[SUBMIT ERROR]", err.message);
      setError(
        err.message ||
          (isEditMode
            ? "Failed to update profile."
            : "Failed to register business.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Return necessary state and functions
  return {
    // State
    formData,
    formErrors,
    isSubmitting,
    isLoadingVendor,
    error,
    imageFile,
    isEditMode,

    // Handlers
    handleChange,
    handleImageChange,
    handleSubmit,
  };
};
