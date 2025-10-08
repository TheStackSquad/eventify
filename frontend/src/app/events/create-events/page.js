// frontend/src/app/events/create-events/page.js
"use client";

import { useState } from "react";
import CreateEventForm from "@/components/create-events/create";

export default function CreateEventsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      // Prepare form data for submission
      const submissionData = new FormData();

      // Append all form fields
      Object.keys(formData).forEach((key) => {
        if (key === "tickets") {
          submissionData.append(key, JSON.stringify(formData[key]));
        } else if (key === "eventImage" && formData[key]) {
          submissionData.append(key, formData[key]);
        } else {
          submissionData.append(key, formData[key]);
        }
      });

      // Simulate API call - replace with your actual API endpoint
      const response = await fetch("/api/events/create", {
        method: "POST",
        body: submissionData,
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      const result = await response.json();

      // Handle successful creation
      console.log("Event created successfully:", result);

      // Redirect to event page or show success message
      // router.push(`/events/${result.eventId}`);
    } catch (error) {
      console.error("Error creating event:", error);
      // Handle error (show toast, error message, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    // Navigate back to events page
    window.history.back();
    // Or use router if you're using Next.js navigation:
    // router.push('/events');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 sm:px-6 lg:px-8">
      <CreateEventForm
        onSubmit={handleSubmit}
        onBack={handleBack}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
