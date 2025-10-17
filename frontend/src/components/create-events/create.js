// frontend/src/components/create-events/create.js
"use client";

import { useEventForm } from "@/components/create-events/hooks/useEventForm";
import StepIndicator from "@/components/create-events/components/stepIndicator";
import BasicInfoStep from "@/components/create-events/formSteps/basicFormStep";
import DateTimeLocationStep from "@/components/create-events/formSteps/dateTimeLocationStep";
import TicketingStep from "@/components/create-events/formSteps/ticketingStep";
import PaymentStep from "@/components/create-events/formSteps/paymentStep";
import NavigationButtons from "@/components/create-events/components/navigationButtons";

export default function CreateEventForm({
  formData,
  onFormChange,
  onSubmit,
  onBack,
  onCancel,
  isSubmitting,
  mode = "create",
  isEditMode = false,
}) {
  console.debug("📝 CreateEventForm Props:", {
    formDataTitle: formData?.eventTitle,
    mode,
    isEditMode,
    isSubmitting,
  });

  const {
    currentStep,
    errors,
    handleInputChange,
    handleTicketChange,
    addTicketTier,
    removeTicketTier,
    handleImageUpload,
    handleNext,
    handlePrevious,
    handleSubmit,
  } = useEventForm(formData, onFormChange, onSubmit);

  const renderStep = () => {
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

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
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
      </div>

      <form onSubmit={handleSubmit} className="p-8">
        <StepIndicator currentStep={currentStep} />
        {renderStep()}

        <NavigationButtons
          currentStep={currentStep}
          onPrevious={handlePrevious}
          onNext={handleNext}
          isSubmitting={isSubmitting}
          isEditMode={isEditMode}
          isReady={true}
        />
      </form>
    </div>
  );
}
