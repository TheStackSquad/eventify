//frontend/src/components/create-events/components/navigationButtons.js
export default function NavigationButtons({
  currentStep,
  onPrevious,
  onNext,
  isSubmitting,
  isEditMode = false,
  isReady = true,
}) {
  // Disable next button if not ready in edit mode or submitting
  const isNextDisabled = isSubmitting || (isEditMode && !isReady);

  // Button text based on mode and step
  const getSubmitButtonText = () => {
    if (isSubmitting) {
      return isEditMode ? "Updating Event..." : "Creating Event...";
    }
    return isEditMode ? "Update Event ✅" : "Launch Event 🚀";
  };

  const getNextButtonText = () => {
    if (isEditMode && !isReady) {
      return "Loading...";
    }
    return "Next Step";
  };

  return (
    <div className="flex justify-between items-center pt-8 border-t border-gray-700 mt-8">
      {/* Previous Button */}
      {currentStep > 1 ? (
        <button
          type="button"
          onClick={onPrevious}
          disabled={isSubmitting || !isReady}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
      ) : (
        <div></div>
      )}

      {/* Next/Submit Button */}
      {currentStep < 4 ? (
        <button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled}
          className={`px-6 py-3 rounded-lg transition font-medium ${
            isNextDisabled
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {getNextButtonText()}
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting || (isEditMode && !isReady)}
          className={`px-8 py-3 font-bold rounded-lg transition ${
            isEditMode
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          } disabled:opacity-50 disabled:cursor-not-allowed text-white`}
        >
          {getSubmitButtonText()}
        </button>
      )}
    </div>
  );
}
