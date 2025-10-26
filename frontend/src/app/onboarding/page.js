// frontend/src/app/onboarding/page.js
"use client";
import { useEffect } from "react";
import OnboardingCTA from "@/components/onboarding/onboardingCTA";

// This would ideally be done server-side in layout.js or with Next.js Metadata API
// but showing client-side approach here for completeness
export default function OnboardingPage() {
  useEffect(() => {
    // Set page title
    document.title =
      "Get Started with Eventify - Create, Discover, and Manage Events";

    // Add meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Join Eventify to discover events, sell tickets, or offer vendor services. One platform for event creators, attendees, and service providers."
      );
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content =
        "Join Eventify to discover events, sell tickets, or offer vendor services. One platform for event creators, attendees, and service providers.";
      document.head.appendChild(meta);
    }

    // Add structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Eventify",
      applicationCategory: "Event Management",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Comprehensive event management platform for creating events, selling tickets, and connecting with vendors",
      featureList: [
        "Event creation and management",
        "Ticket sales and analytics",
        "Vendor marketplace",
        "Secure payment processing",
      ],
      operatingSystem: "Web, iOS, Android",
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 bg-gray-100"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      <OnboardingCTA />
    </div>
  );
}
