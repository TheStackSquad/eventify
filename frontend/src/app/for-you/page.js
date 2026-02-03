// frontend/src/app/for-you/page.js
import Link from "next/link";
 
export default function ForYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Eventify: <span className="text-red-600">For You</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Your personalized event discovery hub is coming soon!
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
          <div className="text-center">
            {/* Icon/Illustration */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-50 to-red-100 rounded-full mb-6">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Personalized Event Recommendations
            </h2>
            <p className="text-gray-600 mb-8">
              We&apos;re building a smart recommendation engine that will show
              you events based on your interests, location, and past activity.
              Sign in to get personalized suggestions when this feature
              launches!
            </p>
            {/* Feature Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-semibold text-gray-800 mb-2">
                  🎯 Tailored Picks
                </div>
                <p className="text-sm text-gray-600">
                  Events matched to your tastes
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-semibold text-gray-800 mb-2">
                  📍 Nearby Events
                </div>
                <p className="text-sm text-gray-600">
                  Discover what&apos;s happening locally
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-semibold text-gray-800 mb-2">
                  📅 Smart Reminders
                </div>
                <p className="text-sm text-gray-600">
                  Never miss events you&apos;ll love
                </p>
              </div>
            </div>
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/events"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg shadow hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95"
              >
                Browse All Events
              </Link>

              <Link
                href="/signin"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-gray-800 font-semibold rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                Sign In for Early Access
              </Link>
            </div>
            {/* Progress Indicator */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Feature in development</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
