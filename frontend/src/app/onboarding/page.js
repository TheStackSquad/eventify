// frontend/src/app/onboarding/page.js

"use client";

// Import the new dedicated CTA component
import OnboardingCTA from "@/components/onboarding/onboardingCTA";

export default function OnboardingPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 bg-gray-100"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      <OnboardingCTA />
    </div>
  );
}
