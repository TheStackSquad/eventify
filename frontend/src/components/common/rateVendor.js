// frontend/src/components/common/rateVendor.js

"use client";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const RateVendor = ({ vendorId, vendorName, onSubmit }) => {
  const dispatch = useDispatch();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Selector for rating state from Redux (if needed)
  // const { loading, error, success } = useSelector(state => state.inquiry.rating);

  const handleStarClick = (selectedRating) => {
    setRating(selectedRating);
  };

  const handleStarHover = (hoverValue) => {
    setHoverRating(hoverValue);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      alert("Please select a rating before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // If using Redux directly
      // await dispatch(submitRating({ vendorId, rating, review: reviewText }));

      // Using the passed onSubmit prop
      if (onSubmit) {
        await onSubmit(rating, reviewText);
      }

      setIsSubmitted(true);
      setReviewText("");
      setRating(0);

      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarIcon = ({ filled, hovered, onClick, onHover, onLeave }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-8 w-8 cursor-pointer transition-all duration-200 transform ${
        hovered ? "scale-110" : "scale-100"
      } ${filled ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= (hoverRating || rating);

      return (
        <StarIcon
          key={starValue}
          filled={isFilled}
          hovered={starValue <= hoverRating}
          onClick={() => handleStarClick(starValue)}
          onHover={() => handleStarHover(starValue)}
          onLeave={handleStarLeave}
        />
      );
    });
  };

  const getRatingText = () => {
    const currentRating = hoverRating || rating;
    switch (currentRating) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "Select a rating";
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Thank You!
        </h3>
        <p className="text-green-600">
          Your rating has been submitted successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="rate-vendor-component">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div className="text-center">
          <div className="flex justify-center space-x-1 mb-2">
            {renderStars()}
          </div>
          <p className="text-sm font-medium text-gray-700">{getRatingText()}</p>
          {rating > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Selected: {rating} star{rating !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Review Textarea */}
        <div>
          <label
            htmlFor="review"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your Review (Optional)
          </label>
          <textarea
            id="review"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this vendor..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
            maxLength={500}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Optional</span>
            <span>{reviewText.length}/500</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200
            focus:outline-none focus:ring-4 focus:ring-blue-300
            ${
              isSubmitting || rating === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            }
          `}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Submitting...
            </div>
          ) : (
            "Submit Rating"
          )}
        </button>

        {/* Error Message (if using Redux) */}
        {/* {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )} */}

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center">
          Your rating and review will be visible to other users and help improve
          our community.
        </p>
      </form>
    </div>
  );
};

export default RateVendor;
