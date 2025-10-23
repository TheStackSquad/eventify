// frontend/src/components/vendorUI/handlers/useVendorFormHandler.js

import React from "react";
import { useDispatch } from "react-redux";
import { registerVendor, updateVendor } from "@/redux/action/vendorAction";
// Import Validation utilities
import {
  vendorRegistrationValidate,
  validateVendorField,
  hasValidationErrors,
} from "@/utils/validate/vendorValidate";

// Custom hook to manage all vendor form logic (registration and update)
export const useVendorFormHandler = ({ vendorId, onSuccess }) => {
  const isEditMode = !!vendorId;
  const dispatch = useDispatch();

  // 1. State Management
  const [formData, setFormData] = React.useState({
    name: "",
    category: "",
    state: "",
    city: "",
    area: "",
    minPrice: "",
    phoneNumber: "",
    // If editing, this might hold the existing URL string
    imageURL: "",
  });
  const [imageFile, setImageFile] = React.useState(null); // Holds the actual File object for new uploads
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [formErrors, setFormErrors] = React.useState({}); // Field-specific validation errors
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
          imageURL: "https://your-domain.com/path/to/existing-image.webp", // Existing URL
        };
        setFormData(mockVendorData);
        setIsLoadingVendor(false);
      }, 1000);
    }
  }, [isEditMode, vendorId]);

  // 3. Handlers

  /** Handles standard input change for text, number, and select fields with live validation. */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null); // Clear global error on any change

    // Live Field Validation
    const errorMsg = validateVendorField(name, value);
    setFormErrors((prev) => ({
      ...prev,
      [name]: errorMsg,
    }));
  };

  /** Handles file input change for the business image with live validation. */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const fileValue = file || null;
    setImageFile(fileValue);

    // Clear imageURL from formData if a new file is selected, as it's no longer the source of truth
    if (file) {
      setFormData((prev) => ({ ...prev, imageURL: "" }));
    }

    // Validation for image file (using the file object)
    const errorMsg = vendorRegistrationValidate(
      {
        ...formData,
        // Pass the file object here for client-side file validation (type, size)
        imageURL: fileValue,
      },
      isEditMode
    ).imageURL;

    setFormErrors((prev) => ({
      ...prev,
      imageURL: errorMsg || null,
    }));

    if (error) setError(null);
  };

  /** Uses the imported comprehensive client-side validation check. */
  const validateForm = () => {
    // Use the comprehensive validation function
    const errors = vendorRegistrationValidate(
      {
        ...formData,
        // For final validation, prioritize the new file object (if present)
        // over the existing URL string. Validation utility must handle both types.
        imageURL: imageFile || formData.imageURL,
      },
      isEditMode
    );

    setFormErrors(errors);

    // Returns true if NO errors are found
    return !hasValidationErrors(errors);
  };

  // Helper function to upload the image file to Vercel Blob via Next.js API Route
  const handleVendorImageUpload = async (file) => {
    const uploadFormData = new FormData();
    // 'file' must match the key expected by /api/vendor-image/route.js
    uploadFormData.append("file", file);

    const response = await fetch("/api/vendor-image", {
      method: "POST",
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Image upload failed.");
    }

    const result = await response.json();
    return result.url; // Returns the public Vercel Blob URL string
  };

  // Enhanced handleSubmit in useVendorFormHandler.js (Debugging Removed)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please correct the highlighted fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFormErrors({});

    try {
      let finalImageUrl = formData.imageURL;

      // 1. Handle Image Upload FIRST (if new file selected)
      if (imageFile) {
        finalImageUrl = await handleVendorImageUpload(imageFile);
        // Update formData immediately with the new image URL
        setFormData((prev) => ({ ...prev, imageURL: finalImageUrl }));
      }

      // 2. Prepare Final Payload with proper type conversions
      const finalPayload = {
        name: formData.name.trim(),
        category: formData.category,
        subCategories: formData.subCategories || [], // Ensure array
        state: formData.state,
        city: formData.city,
        area: formData.area || "", // Default to empty string
        phoneNumber: formData.phoneNumber,
        // Ensure minPrice is converted to a number and defaults to 0 if empty/invalid
        minPrice: Number(formData.minPrice) || 0,
        imageURL: finalImageUrl, // Use the confirmed URL
      };

      // 3. Validate critical fields
      if (!finalPayload.name || !finalPayload.category || !finalPayload.state) {
        // Throwing the error here will jump to the catch block
        throw new Error("Missing required fields");
      }

      // 4. Dispatch to Redux
      const action = isEditMode
        ? updateVendor({ vendorId, data: finalPayload })
        : registerVendor(finalPayload);

      // The .unwrap() method handles API errors and throws them into the catch block
      await dispatch(action).unwrap();

      if (onSuccess) onSuccess();

      // 5. Reset form only for new registrations
      if (!isEditMode) {
        setFormData({
          name: "",
          category: "",
          subCategories: [],
          state: "",
          city: "",
          area: "",
          phoneNumber: "",
          minPrice: "",
          imageURL: "",
        });
        setImageFile(null);
      }
    } catch (err) {
      // We must keep the setError logic to inform the user of failure
      // but the internal console.error has been removed.
      setError(err.message || "Submission failed. Please try again.");
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
