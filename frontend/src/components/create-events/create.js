//frontend/src/components/create-events/create.js
"use client";

import { useEventForm } from "@/components/create-events/hooks/useEventForm";
import StepIndicator from "@/components/create-events/components/stepIndicator";
import BasicInfoStep from "@/components/create-events/formSteps/basicFormStep";
import DateTimeLocationStep from "@/components/create-events/formSteps/dateTimeLocationStep";
import TicketingStep from "@/components/create-events/formSteps/ticketingStep";
import PaymentStep from "@/components/create-events/formSteps/paymentStep";
import NavigationButtons from "@/components/create-events/components/navigationButtons";
import { useEffect, useState } from "react";

export default function CreateEventForm({
  onSubmit,
  onBack,
  onCancel,
  isSubmitting,
  initialData,
  mode = "create",
  isEditMode = false,
}) {
  console.log("📝 CreateEventForm received props:", {
    initialData: !!initialData,
    mode,
    isEditMode,
    isSubmitting,
  });

  // 🆕 Track if we're in edit mode and have data
  const [isReady, setIsReady] = useState(!isEditMode); // Ready immediately for create mode

  const {
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
    handleSubmit: handleFormSubmit,
    resetForm,
    updateFormData,
  } = useEventForm(onSubmit, isEditMode ? null : undefined); // 🆕 Don't pass initialData to hook initially

  // 🆕 CRITICAL FIX: Handle initialData updates safely
  useEffect(() => {
    if (isEditMode && initialData) {
      updateFormData(initialData);
      setIsReady(true);
    }
  }, [isEditMode, initialData]); // Remove updateFormData

  const renderStep = () => {
    // 🆕 Show loading state while data loads in edit mode
    if (isEditMode && !isReady) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading event data...</p>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            handleImageUpload={handleImageUpload}
            isEditMode={isEditMode}
          />
        );
      case 2:
        return (
          <DateTimeLocationStep
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            isEditMode={isEditMode}
          />
        );
      case 3:
        return (
          <TicketingStep
            formData={formData}
            errors={errors}
            handleTicketChange={handleTicketChange}
            addTicketTier={addTicketTier}
            removeTicketTier={removeTicketTier}
            isEditMode={isEditMode}
          />
        );
      case 4:
        return (
          <PaymentStep
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            isEditMode={isEditMode}
          />
        );
      default:
        return null;
    }
  };

  // Debug current form state
  console.log("📝 Form State:", {
    isReady,
    isEditMode,
    hasInitialData: !!initialData,
    formData: formData.eventTitle ? `"${formData.eventTitle}"` : "Empty",
  });

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
      {/* Header - Updated for edit mode */}
      <div
        className={`p-6 ${
          isEditMode
            ? "bg-gradient-to-r from-blue-600 to-indigo-600"
            : "bg-gradient-to-r from-green-600 to-emerald-600"
        }`}
      >
        <button
          onClick={onBack}
          className="text-white/80 hover:text-white mb-4 flex items-center gap-2 text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {isEditMode ? "Back to Events" : "Back to Overview"}
        </button>
        <h2 className="text-3xl font-bold text-white">
          {isEditMode ? "Edit Your Event" : "Create Your Event"}
        </h2>
        <p className="text-white/80 mt-2">
          {isEditMode
            ? "Update your event details below"
            : "Fill in the details to launch your event"}
        </p>

        {/* Show edit mode indicator */}
        {isEditMode && (
          <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 inline-flex items-center">
            <svg
              className="w-4 h-4 text-white mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <span className="text-white text-sm font-medium">
              {isReady ? "Edit Mode - Data Loaded" : "Loading Event Data..."}
            </span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleFormSubmit(e);
        }}
        className="p-8"
      >
        <StepIndicator currentStep={currentStep} />
        {renderStep()}

        <NavigationButtons
          currentStep={currentStep}
          onPrevious={handlePrevious}
          onNext={handleNext}
          isSubmitting={isSubmitting}
          isEditMode={isEditMode}
          isReady={isReady}
        />
      </form>
    </div>
  );
}
