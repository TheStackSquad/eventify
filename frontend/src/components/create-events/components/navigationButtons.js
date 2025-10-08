//frontend/src/components/create-events/components/navigationButtons.js

export default function NavigationButtons({
  currentStep,
  onPrevious,
  onNext,
  isSubmitting,
}) {
  return (
    <div className="flex justify-between items-center pt-8 border-t border-gray-700 mt-8">
      {currentStep > 1 ? (
        <button
          type="button"
          onClick={onPrevious}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
        >
          Previous
        </button>
      ) : (
        <div></div>
      )}

      {currentStep < 4 ? (
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Next Step
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating Event..." : "Launch Event 🚀"}
        </button>
      )}
    </div>
  );
}

