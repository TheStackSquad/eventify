// frontend/src/utils/validate/vendorValidate.js

export const vendorRegistrationValidate = (formData, isEditMode = false) => {
  const errors = {};

  // ========== BUSINESS NAME ==========
  if (!formData.name?.trim()) {
    errors.name = "Business name is required";
  } else if (formData.name.trim().length < 3) {
    errors.name = "Business name must be at least 3 characters";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Business name must not exceed 100 characters";
  }

  // ========== CATEGORY ==========
  if (!formData.category || formData.category === "") {
    errors.category = "Please select a service category";
  }

  // ========== STATE ==========
  if (!formData.state || formData.state === "") {
    errors.state = "Please select your primary state";
  }

  // ========== CITY (Optional but if provided, validate) ==========
  if (formData.city && formData.city.trim().length > 100) {
    errors.city = "City/Area must not exceed 100 characters";
  }

  // ========== PHONE NUMBER ==========
  if (!formData.phoneNumber?.trim()) {
    errors.phoneNumber = "Phone number is required";
  } else {
    // Remove all non-digit characters for validation
    const cleanedPhone = formData.phoneNumber.replace(/\D/g, "");

    // Nigerian phone number patterns:
    // - 11 digits starting with 0 (e.g., 08012345678)
    // - 10 digits (e.g., 8012345678)
    // - 13 digits starting with 234 (e.g., 2348012345678)
    const isValid =
      (cleanedPhone.length === 11 && cleanedPhone.startsWith("0")) ||
      (cleanedPhone.length === 10 && /^[789]/.test(cleanedPhone)) ||
      (cleanedPhone.length === 13 && cleanedPhone.startsWith("234"));

    if (!isValid) {
      errors.phoneNumber = "Invalid Nigerian phone number format";
    }
  }

  // ========== MINIMUM PRICE ==========
  if (!formData.minPrice) {
    errors.minPrice = "Starting price is required";
  } else {
    const price = parseInt(formData.minPrice, 10);

    if (isNaN(price)) {
      errors.minPrice = "Price must be a valid number";
    } else if (price < 1000) {
      errors.minPrice = "Starting price must be at least ₦1,000";
    } else if (price > 100000000) {
      errors.minPrice = "Starting price must not exceed ₦100,000,000";
    }
  }

  // ========== IMAGE ==========
  // Image is required for new registrations, optional for updates
  if (!isEditMode && !formData.imageURL) {
    errors.imageURL = "Business image is required";
  }

  // If image is provided as a file object, validate it
  if (formData.imageURL && typeof formData.imageURL === "object") {
    const file = formData.imageURL;
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      errors.imageURL =
        "Invalid file type. Only JPG, PNG, and WEBP are allowed";
    } else if (file.size > maxSize) {
      errors.imageURL = "Image size must not exceed 5MB";
    }
  }

  return errors;
};

export const validateVendorField = (fieldName, value, allFormData = {}) => {
  switch (fieldName) {
    case "name":
      if (!value?.trim()) return "Business name is required";
      if (value.trim().length < 3) return "Must be at least 3 characters";
      if (value.trim().length > 100) return "Must not exceed 100 characters";
      return null;

    case "category":
      if (!value || value === "") return "Please select a category";
      return null;

    case "state":
      if (!value || value === "") return "Please select your state";
      return null;

    case "city":
      if (value && value.trim().length > 100)
        return "Must not exceed 100 characters";
      return null;

    case "phoneNumber":
      if (!value?.trim()) return "Phone number is required";
      const cleanedPhone = value.replace(/\D/g, "");
      const isValid =
        (cleanedPhone.length === 11 && cleanedPhone.startsWith("0")) ||
        (cleanedPhone.length === 10 && /^[789]/.test(cleanedPhone)) ||
        (cleanedPhone.length === 13 && cleanedPhone.startsWith("234"));
      if (!isValid) return "Invalid Nigerian phone number";
      return null;

    case "minPrice":
      if (!value) return "Starting price is required";
      const price = parseInt(value, 10);
      if (isNaN(price)) return "Must be a valid number";
      if (price < 1000) return "Must be at least ₦1,000";
      if (price > 100000000) return "Must not exceed ₦100,000,000";
      return null;

    case "imageURL":
      if (!value) return "Business image is required";
      if (typeof value === "object") {
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
        const maxSize = 5 * 1024 * 1024;
        if (!validTypes.includes(value.type)) {
          return "Only JPG, PNG, and WEBP are allowed";
        }
        if (value.size > maxSize) return "Image must not exceed 5MB";
      }
      return null;

    default:
      return null;
  }
};

export const hasValidationErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

export const getErrorCountMessage = (errors) => {
  const count = Object.keys(errors).length;
  if (count === 0) return "";
  if (count === 1) return "Please fix 1 error in the form";
  return `Please fix ${count} errors in the form`;
};
