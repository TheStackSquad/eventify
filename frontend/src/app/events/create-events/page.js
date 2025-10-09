// frontend/src/app/events/create-events/page.js
"use client";

import { useState } from "react";
// Import the Redux action creator
import { createEvent } from "@/redux/action/eventAction";
// Import the Redux dispatch hook
import { useDispatch } from "react-redux";
import CreateEventForm from "@/components/create-events/create";

export default function CreateEventsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch(); // Initialize dispatch hook

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      let finalEventData = { ...formData }; // Start with a copy of the raw form data
      let imageUrl = null;

      // --- STAGE 1: UPLOAD IMAGE TO VERCEL BLOB (AWAIT) ---
      if (formData.eventImage) {
        // Create FormData object for the file *only* for the upload route
        const imageUploadFormData = new FormData();
        imageUploadFormData.append("file", formData.eventImage);

        // Call the dedicated Next.js API route to handle Vercel Blob upload
        const uploadResponse = await fetch("/api/event-image", {
          method: "POST",
          body: imageUploadFormData,
        });

        if (!uploadResponse.ok) {
          // If image upload fails, stop execution and throw error
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload cover image.");
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
      }

      // --- STAGE 2: PREPARE FINAL PAYLOAD FOR GO BACKEND ---

      // 1. Replace the raw File object with the public URL
      if (imageUrl) {
        finalEventData.eventImage = imageUrl;
      } else {
        // Remove the key if no image was selected (optional based on your backend validation)
        delete finalEventData.eventImage;
      }

      // 2. Tidy up unused keys (like the local preview URL)
      delete finalEventData.eventImagePreview;

      // 3. Ensure tickets are JSON stringified if the Go backend expects a string
  

      // --- STAGE 3: DISPATCH REDUX ACTION (AWAIT) ---
      const resultAction = await dispatch(createEvent(finalEventData));

      // Check if the thunk succeeded using unwrap (if you used .unwrap() or check the payload)
      if (createEvent.fulfilled.match(resultAction)) {
        // Handle successful creation (The toast is handled by the thunk)
        console.log("Event created successfully:", resultAction.payload);
        // router.push(`/events/${resultAction.payload.eventId}`);
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