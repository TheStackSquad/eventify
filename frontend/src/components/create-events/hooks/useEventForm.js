//frontend/src/components/create-events/hooks/useEventForm.js
import { useState, useEffect, useRef } from "react";
import { INITIAL_FORM_DATA } from "../constants/formConfig";
import { validateStep } from "../utils/validation";

export const useEventForm = (onSubmit, initialData = null) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});

  // 🆕 Use ref to track if we've initialized with initialData
  const hasInitialized = useRef(false);

  // 🆕 CRITICAL FIX: Initialize form with initialData ONCE when available
  useEffect(() => {
    if (initialData && !hasInitialized.current) {
      console.log(
        "🔄 useEventForm: Initializing with initialData",
        initialData
      );
      setFormData(initialData);
      hasInitialized.current = true;
    }
  }, [initialData]);

  // 🆕 FUNCTION TO RESET FORM STATE
  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setErrors({});
    hasInitialized.current = false; // Reset the flag
  };

  // 🆕 FUNCTION TO UPDATE FORM DATA EXTERNALLY (for edits)
  const updateFormData = (newData) => {
    console.log("🔄 useEventForm: Updating form data", newData);
    setFormData(newData);
    hasInitialized.current = true;
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
    resetForm,
    updateFormData,
  };
};
