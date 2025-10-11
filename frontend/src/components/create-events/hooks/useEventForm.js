//frontend/src/components/create-events/hooks/useEventForm.js

import { useState } from "react";
import { INITIAL_FORM_DATA } from "../constants/formConfig";
import { validateStep } from "../utils/validation";

export const useEventForm = (onSubmit) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});

  // 🆕 FUNCTION TO RESET FORM STATE
  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1); // Reset to the first step
    setErrors({}); // Clear any validation errors
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleTicketChange = (index, field, value) => {
    const updatedTickets = [...formData.tickets];
    updatedTickets[index] = {
      ...updatedTickets[index],
      [field]: value,
    };
    setFormData((prev) => ({
      ...prev,
      tickets: updatedTickets,
    }));
  };

  const addTicketTier = () => {
    setFormData((prev) => ({
      ...prev,
      tickets: [
        ...prev.tickets,
        {
          tierName: "",
          price: "",
          quantity: "",
          description: "",
        },
      ],
    }));
  };

  const removeTicketTier = (index) => {
    if (formData.tickets.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index),
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        eventImage: file,
        eventImagePreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep, formData, setErrors)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(4, formData, setErrors)) {
      // 🚨 KEY CHANGE: Pass formData AND the resetForm function
      onSubmit(formData, resetForm);
    }
  };

  return {
    currentStep,
    formData,
    errors,
    handleInputChange,
    handleTicketChange,
    addTicketTier,
    removeTicketTier,
    handleImageUpload,
    handleNext,
    handlePrevious,
    handleSubmit,
    // Note: resetForm is NOT returned because the component doesn't call it directly.
  };
};
