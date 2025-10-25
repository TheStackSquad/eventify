// frontend/src/components/common/rateVendor.js

"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createReview } from "@/redux/action/reviewAction";
import { resetCreateReviewStatus } from "@/redux/reducer/reviewReducer";
import { STATUS } from "@/utils/constants/globalConstants";

const RateVendor = ({ vendorId, vendorName, onClose }) => {
  const dispatch = useDispatch();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // ✅ Get Redux state
  const { status, error } = useSelector((state) => state.reviews.createReview);

  const isSubmitting = status === STATUS.LOADING;
  const isSubmitted = status === STATUS.SUCCESS;
  const hasError = status === STATUS.ERROR;

  // ✅ Reset form after successful submission
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        dispatch(resetCreateReviewStatus());
        setReviewText("");
        setRating(0);
        if (onClose) {
          onClose(); // Close modal/form after success
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isSubmitted, dispatch, onClose]);

  // ✅ Reset error on unmount
  useEffect(() => {
    return () => {
      dispatch(resetCreateReviewStatus());
    };
  }, [dispatch]);

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

    // ✅ Dispatch Redux action
    dispatch(
      createReview({
        vendorId,
        rating,
        content: reviewText,
      })
    );
  };

  const StarIcon = ({ filled, hovered, onClick, onHover, onLeave }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-10 w-10 cursor-pointer transition-all duration-200 transform ${
        hovered ? "scale-125 rotate-12" : "scale-100"
      } ${
        filled
          ? "text-yellow-400 fill-current drop-shadow-lg"
          : "text-gray-300 hover:text-gray-400"
      }`}
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
    const ratingTexts = {
      1: { text: "Poor", emoji: "😞", color: "text-red-600" },
      2: { text: "Fair", emoji: "😕", color: "text-orange-600" },
      3: { text: "Good", emoji: "😊", color: "text-yellow-600" },
      4: { text: "Very Good", emoji: "😄", color: "text-lime-600" },
      5: { text: "Excellent", emoji: "🤩", color: "text-green-600" },
    };

    if (currentRating === 0) {
      return {
        text: "Select a rating",
        emoji: "⭐",
        color: "text-gray-600",
      };
    }

    return ratingTexts[currentRating];
  };

  // ✅ Success State
  if (isSubmitted) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 text-center shadow-xl animate-fade-in">
        <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce-in">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div className="absolute -top-1 -right-1">
            <span className="text-2xl animate-ping-slow">🎉</span>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Thank You!</h3>
        <p className="text-green-700 font-medium mb-1">
          Your review has been submitted successfully.
        </p>
        <p className="text-sm text-green-600">
          It will be visible after moderation approval.
        </p>
      </div>
    );
  }

  const ratingInfo = getRatingText();

  return (
    <div className="rate-vendor-component bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border border-gray-200 p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Rate {vendorName || "this vendor"}
        </h2>
        <p className="text-sm text-gray-600">
          Share your experience to help others make better decisions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div className="text-center bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex justify-center space-x-2 mb-4">
            {renderStars()}
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-3xl">{ratingInfo.emoji}</span>
            <p className={`text-xl font-bold ${ratingInfo.color}`}>
              {ratingInfo.text}
            </p>
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              {rating} out of 5 stars
            </p>
          )}
        </div>

        {/* Review Textarea */}
        <div>
          <label
            htmlFor="review"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Your Review
            <span className="text-gray-400 font-normal ml-2">(Optional)</span>
          </label>
          <div className="relative">
            <textarea
              id="review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell us about your experience with this vendor... What did you like? What could be improved?"
              rows={5}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none shadow-sm hover:border-gray-300"
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded">
              {reviewText.length}/500
            </div>
          </div>
        </div>

        {/* ✅ Error Message */}
        {hasError && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-shake">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">
                  {error || "Failed to submit review"}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Please try again or contact support if the issue persists.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className={`
            w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300
            focus:outline-none focus:ring-4 focus:ring-blue-300
            ${
              isSubmitting || rating === 0
                ? "bg-gray-400 cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
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
              Submitting Your Review...
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span>Submit Review</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>
          )}
        </button>

        {/* Privacy Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Your review will be moderated before being published. We verify
              all reviews to maintain quality and authenticity. Reviews help
              other users make informed decisions.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RateVendor;