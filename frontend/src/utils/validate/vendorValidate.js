//frontend/src/utils/validate/vendorValidate.js

/**
 * @fileoverview Client-side validation logic for the Vendor Registration Form.
 * This function returns an object containing validation errors if any fields are invalid.
 */

// Basic regular expression for Nigerian phone numbers (starts with 070, 080, 090, 081, 091 and is 11 digits)
const NIGERIAN_PHONE_REGEX = /^(0(70|80|90|81|91))[0-9]{8}$/;

/**
 * Validates the vendor registration data object.
 * @param {object} data - The form data containing vendor details.
 * @returns {object} An object where keys are field names and values are error messages,
 * or an empty object if validation succeeds.
 */
export const vendorRegistrationValidate = (data) => {
    const errors = {};

    // 1. Name Validation (Required, Min Length)
    if (!data.name || data.name.trim() === "") {
        errors.name = "Business name is required.";
    } else if (data.name.length < 3) {
        errors.name = "Business name must be at least 3 characters long.";
    }

    // 2. Category Validation (Required, Specific options)
    if (!data.category || data.category.trim() === "") {
        errors.category = "Please select a primary category for your service.";
    }
    // NOTE: In a real app, you'd check if data.category is in a predefined list.

    // 3. State Validation (Required)
    if (!data.state || data.state.trim() === "") {
        errors.state = "Your primary operating state (e.g., Lagos, FCT) is required.";
    }

    // 4. City/Area Validation (Recommended, but kept optional based on model structure)
    if (!data.city || data.city.trim() === "") {
        // Warning, but not a hard error for MVP
        // errors.city = "Please specify a major city for better visibility.";
    }

    // 5. MinPrice Validation (Required, Numerical, Minimum value)
    const minPrice = parseInt(data.minPrice, 10);
    if (isNaN(minPrice) || data.minPrice === "") {
        errors.minPrice = "Starting price is required and must be a number.";
    } else if (minPrice < 1000) {
        errors.minPrice = "Starting price must be at least ₦1,000.";
    }

    // 6. Phone Number Validation (Optional, but if provided, must be valid)
    if (data.phoneNumber && data.phoneNumber.trim() !== "") {
        if (!NIGERIAN_PHONE_REGEX.test(data.phoneNumber)) {
            errors.phoneNumber = "Invalid Nigerian phone number format (e.g., 080XXXXXXXX).";
        }
    }

    return errors;
};