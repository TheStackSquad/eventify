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

  /** Handles form submission (Registration or Update) using Redux Thunks. */
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
      let finalImageUrl = formData.imageURL || ""; // Start with existing URL

      // 1. Handle Image Upload (only for a NEW file)
      if (imageFile) {
        // Upload the new file and get the public URL string
        finalImageUrl = await handleVendorImageUpload(imageFile);
        console.log("[IMAGE UPLOAD] Received URL:", finalImageUrl);
      }

      // 2. Prepare Final JSON Payload
      // This payload contains only text fields and the final image URL string.
      const finalPayload = {
        ...formData,
        minPrice: Number(formData.minPrice),
        imageURL: finalImageUrl,
      };

      console.debug("Final JSON payload to backend:", finalPayload);

      // 3. Determine Action and Dispatch (Sending clean JSON payload to Go backend)
      const action = isEditMode
        ? updateVendor({ vendorId, data: finalPayload })
        : registerVendor(finalPayload);

      // Dispatch action and wait for 200/201 response
      const result = await dispatch(action).unwrap();

      console.log("[SUBMIT] Submission successful:", result);
      if (onSuccess) onSuccess(); // Notify parent component

      // 4. Clear form after successful registration
      if (!isEditMode) {
        setFormData({
          name: "",
          category: "",
          state: "",
          city: "",
          minPrice: "",
          phoneNumber: "",
          imageURL: "",
        });
        setImageFile(null);
      }
    } catch (err) {
      // Error handling is managed by the Redux Thunk and toastAlert
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
