// frontend/src/app/events/create-events/page.js
"use client";

import { useState } from "react";
import { createEvent } from "@/redux/action/eventAction";
import { useDispatch, useSelector } from "react-redux";
import CreateEventForm from "@/components/create-events/create";

export default function CreateEventsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  // Get user data from Redux auth state
  const { user } = useSelector((state) => state.auth);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      // Validate user is authenticated
      if (!user || !user.id) {
        throw new Error(
          "Authentication required. Please log in to create an event."
        );
      }

      let finalEventData = { ...formData };
      console.log("Raw Form Data:", finalEventData);

      let imageUrl = null;

      // --- STAGE 1: IMAGE UPLOAD ---
      if (formData.eventImage) {
        const imageUploadFormData = new FormData();
        imageUploadFormData.append("file", formData.eventImage);

        const uploadResponse = await fetch("/api/event-image", {
          method: "POST",
          body: imageUploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload cover image.");
        }

        const uploadResult = await uploadResponse.json();
        console.log("Image upload result:", uploadResult);
        imageUrl = uploadResult.url;
          console.log("ImagUrl:", imageUrl);
      }
    

      // --- STAGE 2: PAYLOAD PREPARATION ---

      // Add required organizer ID from authenticated user
      finalEventData.organizerId = user.id;

      // Set uploaded image URL
      if (imageUrl) {
        finalEventData.eventImage = imageUrl;
      }

      // Format date/time fields for Go's time.Time binding
      if (finalEventData.startDate && finalEventData.startTime) {
        const startDateTime = new Date(
          `${finalEventData.startDate}T${finalEventData.startTime}:00`
        );
        const endDateTime = new Date(
          `${finalEventData.endDate}T${finalEventData.endTime}:00`
        );

        if (!isNaN(startDateTime)) {
          finalEventData.startDate = startDateTime.toISOString();
        }
        if (!isNaN(endDateTime)) {
          finalEventData.endDate = endDateTime.toISOString();
        }
      }

      // Convert maxAttendees to integer if present
      if (finalEventData.maxAttendees) {
        finalEventData.maxAttendees = parseInt(finalEventData.maxAttendees, 10);
      }

      // Cleanup unused fields
      delete finalEventData.eventImagePreview;
      delete finalEventData.startTime;
      delete finalEventData.endTime;
      delete finalEventData.timezone;
      delete finalEventData.maxAttendees;

      console.log(
        "Final payload to backend:",
        JSON.stringify(finalEventData, null, 2)
      );

      // --- STAGE 3: DISPATCH REDUX ACTION ---
      const resultAction = await dispatch(createEvent(finalEventData));
      console.log("Dispatch result:", resultAction);

      if (createEvent.fulfilled.match(resultAction)) {
        // Handle successful creation
        console.log("Event created successfully!");
        // Optional: Redirect to event page or show success message
      }
    } catch (error) {
      console.error("Error creating event:", error.message || error);
      // The Redux thunk handles the user-facing toast for API errors.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    window.history.back();
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
