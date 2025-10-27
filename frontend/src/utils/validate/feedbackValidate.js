//frontend/src/utils/validate/feedbackValidate.js

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates the feedback form data.
 * @param {object} data - The form data ({ name, email, type, message })
 * @returns {{isValid: boolean, errors: object}}
 */
export const feedbackValidate = (data) => {
  const errors = {};

  if (!data.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!data.email.trim()) {
    errors.email = "Email is required.";
  } else if (!emailRegex.test(data.email)) {
    errors.email = "Invalid email format.";
  }

  if (!data.message.trim()) {
    errors.message = "Message is required.";
  } else if (data.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters long.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Exporting the default is sometimes cleaner for quick imports
export default feedbackValidate;
