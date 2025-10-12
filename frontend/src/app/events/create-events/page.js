// frontend/src/app/events/create-events/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createEvent,
  updateEvent,
  getEventById,
} from "@/redux/action/eventAction";
import { useDispatch, useSelector } from "react-redux";
import CreateEventForm from "@/components/create-events/create";
import toastAlert from "@/components/common/toast/toastAlert";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import ErrorBoundary from "@/components/common/error/errorBoundary";
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
} from "@/utils/constants/globalConstants";

// Local constants for this component
const COMPONENT_CONSTANTS = {
  MESSAGES: {
    LOADING_EVENT: "Loading event data...",
    UPLOAD_ERROR: "Failed to upload cover image.",
  },
};

export default function CreateEventsPage() {
  // ========== STATE MANAGEMENT ==========
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [error, setError] = useState(null);

  // ========== HOOKS & REDUX ==========
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const eventId = searchParams.get("id");

  // Redux state selectors
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { currentEvent } = useSelector((state) => state.events);

  // ========== AUTHENTICATION GUARD ==========
  useEffect(() => {
    if (!isAuthenticated) {
      toastAlert.error(ERROR_MESSAGES.AUTH_REQUIRED);
      router.push(ROUTES.LOGIN);
    }
  }, [isAuthenticated, router]);

  // ========== EVENT DATA FETCHING ==========
  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        setInitialData(null);
        return;
      }

      setIsLoadingEvent(true);
      setError(null);

      try {
        console.log("🎯 Fetching event with ID:", eventId);
        const result = await dispatch(getEventById(eventId));

        if (getEventById.rejected.match(result)) {
          throw new Error(
            result.payload?.message || ERROR_MESSAGES.FETCH_EVENT_FAILED
          );
        }

        console.log("✅ Event fetched successfully");
      } catch (error) {
        console.error("Error fetching event:", error);
        setError(error.message);
        toastAlert.error(error.message);
      } finally {
        setIsLoadingEvent(false);
      }
    };

    fetchEventData();
  }, [eventId, dispatch]);

  // ========== DATA TRANSFORMATION ==========
  useEffect(() => {
    if (currentEvent && eventId) {
      console.log("🔄 Transforming currentEvent:", currentEvent);
      const transformedData = transformEventToFormData(currentEvent);
      console.log("✅ Transformed data:", transformedData);
      setInitialData(transformedData);
    }
  }, [currentEvent, eventId]);

  /**
   * Transforms backend event data to form-compatible format
   */
  const transformEventToFormData = (event) => {
    console.log("🔄 Raw event data for transformation:", event);

    const formData = {
      // Basic Information - FIXED: Use eventImage instead of eventImageURL
      eventTitle: event.eventTitle || "",
      eventDescription: event.eventDescription || "",
      category: event.category || "",
      eventType: event.eventType || "physical",
      eventImage: event.eventImage || event.eventImageURL || "", // FIXED

      // Location Details
      venueName: event.venueName || "",
      venueAddress: event.venueAddress || "",
      city: event.city || "",
      state: event.state || "",
      country: event.country || "",

      // Virtual Event Details
      virtualPlatform: event.virtualPlatform || "",
      meetingLink: event.meetingLink || "",

      // Date & Time (Split for form inputs)
      startDate: event.startDate
        ? new Date(event.startDate).toISOString().split("T")[0]
        : "",
      startTime: event.startDate
        ? new Date(event.startDate).toTimeString().slice(0, 5)
        : "",
      endDate: event.endDate
        ? new Date(event.endDate).toISOString().split("T")[0]
        : "",
      endTime: event.endDate
        ? new Date(event.endDate).toTimeString().slice(0, 5)
        : "",

      // Ticket Information - FIXED: Use tickets instead of ticketTiers
      tickets: event.tickets || event.ticketTiers || [], // FIXED

      // Additional Options
      tags: event.tags || [],
      maxAttendees: event.maxAttendees?.toString() || "",
    };

    console.log("✅ Final transformed formData:", formData);
    return formData;
  };

  // ========== IMAGE UPLOAD HANDLER ==========
  const handleImageUpload = async (imageFile) => {
    const formData = new FormData();
    formData.append("file", imageFile);

    const response = await fetch("/api/event-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || COMPONENT_CONSTANTS.MESSAGES.UPLOAD_ERROR
      );
    }

    const result = await response.json();
    return result.url;
  };

  // ========== PAYLOAD PREPARATION ==========
  const prepareEventPayload = (formData, imageUrl) => {
    const payload = {
      ...formData,
      organizerId: user.id,
    };

    // Add image URL if available
    if (imageUrl) {
      payload.eventImage = imageUrl;
    }

    // Combine date and time fields
    if (payload.startDate && payload.startTime) {
      const startDateTime = new Date(
        `${payload.startDate}T${payload.startTime}`
      );
      const endDateTime = new Date(`${payload.endDate}T${payload.endTime}`);

      if (!isNaN(startDateTime.getTime())) {
        payload.startDate = startDateTime.toISOString();
      }
      if (!isNaN(endDateTime.getTime())) {
        payload.endDate = endDateTime.toISOString();
      }
    }

    // Convert numeric fields
    if (payload.maxAttendees) {
      payload.maxAttendees = parseInt(payload.maxAttendees, 10);
    }

    // Remove temporary form fields
    const fieldsToRemove = [
      "eventImagePreview",
      "startTime",
      "endTime",
      "timezone",
    ];

    fieldsToRemove.forEach((field) => delete payload[field]);

    return payload;
  };

  // ========== MAIN SUBMIT HANDLER ==========
  const handleSubmit = async (formData, resetForm) => {
    // Validation Checks
    if (!user?.id) {
      toastAlert.error(ERROR_MESSAGES.AUTH_REQUIRED);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl = null;

      // Handle Image Upload (only for new files)
      if (formData.eventImage && typeof formData.eventImage !== "string") {
        imageUrl = await handleImageUpload(formData.eventImage);
      } else if (formData.eventImage) {
        imageUrl = formData.eventImage; // Existing URL
      }

      // Prepare final payload
      const finalPayload = prepareEventPayload(formData, imageUrl);

      console.debug("Final payload to backend:", finalPayload);

      // Dispatch appropriate action
      let resultAction;
      if (eventId) {
        resultAction = await dispatch(
          updateEvent({
            eventId,
            updates: finalPayload,
          })
        );
      } else {
        resultAction = await dispatch(createEvent(finalPayload));
      }

      // Handle action result
      if (resultAction.error) {
        throw new Error(resultAction.payload?.message || "Operation failed");
      }

      // Success handling
      const successMessage = eventId
        ? SUCCESS_MESSAGES.EVENT_UPDATED
        : SUCCESS_MESSAGES.EVENT_CREATED;

      toastAlert.success(successMessage);

      // Reset form and redirect
      if (resetForm) resetForm();

      // Redirect after successful creation
      if (!eventId) {
        router.push(ROUTES.MY_EVENTS);
      }
    } catch (error) {
      console.error("Error processing event:", error);
      setError(error.message);
      // Error toast is handled by the thunk
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== NAVIGATION HANDLERS ==========
  const handleBack = () => {
    router.back();
  };

  const handleCancel = () => {
    router.push(ROUTES.MY_EVENTS);
  };

  // Debug logging
  console.log("🎯 Page State:", {
    eventId,
    hasCurrentEvent: !!currentEvent,
    hasInitialData: !!initialData,
    isLoadingEvent,
    error,
  });

  // ========== RENDER LOGIC ==========

  // Show loading state
  if (isLoadingEvent) {
    return (
      <LoadingSpinner
        message={COMPONENT_CONSTANTS.MESSAGES.LOADING_EVENT}
        size="lg"
        color="indigo"
      />
    );
  }

  // Show error state
  if (error && !initialData) {
    return (
      <ErrorBoundary
        error={error}
        onRetry={() => window.location.reload()}
        onBack={handleBack}
      />
    );
  }

  // Main render
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 sm:px-6 lg:px-8">
        <CreateEventForm
          onSubmit={handleSubmit}
          onBack={handleBack}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          initialData={initialData}
          mode={eventId ? "edit" : "create"}
          isEditMode={!!eventId}
        />
      </div>
    </ErrorBoundary>
  );
}
