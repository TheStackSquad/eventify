// frontend/src/app/events/create-events/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  createEvent,
  updateEvent,
  getEventById,
} from "@/redux/action/eventAction";
import CreateEventForm from "@/components/create-events/create";
import toastAlert from "@/components/common/toast/toastAlert";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import { INITIAL_FORM_DATA } from "@/components/create-events/constants/formConfig";
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
} from "@/utils/constants/globalConstants";

const transformEventToFormData = (event) => {
  const safeParseDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
  };

  const safeParseTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "" : date.toTimeString().slice(0, 5);
  };

  return {
    eventTitle: event.eventTitle || "",
    eventDescription: event.eventDescription || "",
    category: event.category || "",
    eventType: event.eventType || "physical",
    eventImage: event.eventImage || "",
    venueName: event.venueName || "",
    venueAddress: event.venueAddress || "",
    city: event.city || "",
    state: event.state || "",
    country: event.country || "",
    virtualPlatform: event.virtualPlatform || "",
    meetingLink: event.meetingLink || "",
    startDate: safeParseDate(event.startDate),
    startTime: safeParseTime(event.startDate),
    endDate: safeParseDate(event.endDate),
    endTime: safeParseTime(event.endDate),
    tickets: event.tickets || [],
    tags: event.tags || [],
    maxAttendees: event.maxAttendees?.toString() || "",
  };
};

export default function CreateEventsPage() {
  // ========== STATE MANAGEMENT (NOW OWNS FORM DATA) ==========
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const eventId = searchParams.get("id");

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
        setFormData(INITIAL_FORM_DATA); // Reset for create mode
        return;
      }

      setIsLoadingEvent(true);
      setError(null);

      try {
        console.debug("🎯 Fetching event with ID:", eventId);
        const result = await dispatch(getEventById(eventId));

        if (getEventById.rejected.match(result)) {
          throw new Error(
            result.payload?.message || ERROR_MESSAGES.FETCH_EVENT_FAILED
          );
        }

        console.debug("✅ Event fetched successfully");
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

  // ========== UPDATE FORM DATA WHEN REDUX DATA ARRIVES ==========
  useEffect(() => {
    if (eventId && currentEvent) {
      console.debug("🔄 Transforming and setting form data:", currentEvent);
      const transformedData = transformEventToFormData(currentEvent);
      setFormData(transformedData);
      console.debug("✅ Form data updated:", transformedData);
    }
  }, [currentEvent, eventId]);

  // ========== FORM CHANGE HANDLER ==========
  const handleFormChange = (updatedFormData) => {
    console.debug("📝 Form data changed:", updatedFormData);
    setFormData(updatedFormData);
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
      throw new Error(errorData.error || "Failed to upload cover image.");
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

    console.log("📦 Preparing payload from formData:", formData);

    if (imageUrl) {
      payload.eventImage = imageUrl;
    }

    if (payload.startDate && payload.startTime) {
      const startDateTimeStr = `${payload.startDate}T${payload.startTime}:00`;
      const endDateTimeStr = `${payload.endDate}T${payload.endTime}:00`;

      const startDateTime = new Date(startDateTimeStr);
      const endDateTime = new Date(endDateTimeStr);

      if (!isNaN(startDateTime.getTime())) {
        payload.startDate = startDateTime.toISOString();
      }
      if (!isNaN(endDateTime.getTime())) {
        payload.endDate = endDateTime.toISOString();
      }
    }

    if (payload.maxAttendees) {
      payload.maxAttendees = parseInt(payload.maxAttendees, 10);
      if (isNaN(payload.maxAttendees)) {
        delete payload.maxAttendees;
      }
    } else {
      delete payload.maxAttendees;
    }

    const fieldsToRemove = [
      "eventImagePreview",
      "startTime",
      "endTime",
      "timezone",
    ];

    fieldsToRemove.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        delete payload[field];
      }
    });

    console.log("✅ Final payload:", payload);
    return payload;
  };

  // ========== MAIN SUBMIT HANDLER ==========
  const handleSubmit = async (finalFormData) => {
    if (!user?.id) {
      toastAlert.error(ERROR_MESSAGES.AUTH_REQUIRED);
      return;
    }

    if (typeof finalFormData !== "object" || Array.isArray(finalFormData)) {
      toastAlert.error("Form submission error: Invalid data received.");
      console.error("❌ Invalid formData:", finalFormData);
      return;
    }

    console.log("🚀 Submitting form with data:", finalFormData);

    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl = null;

      if (
        finalFormData.eventImage &&
        typeof finalFormData.eventImage !== "string"
      ) {
        imageUrl = await handleImageUpload(finalFormData.eventImage);
      } else if (finalFormData.eventImage) {
        imageUrl = finalFormData.eventImage;
      }

      const finalPayload = prepareEventPayload(finalFormData, imageUrl);

      console.debug("📤 Sending payload to backend:", finalPayload);

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

      if (resultAction.error) {
        throw new Error(resultAction.payload?.message || "Operation failed");
      }

      const successMessage = eventId
        ? SUCCESS_MESSAGES.EVENT_UPDATED
        : SUCCESS_MESSAGES.EVENT_CREATED;

      toastAlert.success(successMessage);

      // Reset form on successful create
      if (!eventId) {
        setFormData(INITIAL_FORM_DATA);
        router.push(ROUTES.MY_EVENTS);
      }
    } catch (error) {
      console.error("❌ Error processing event:", error);
      setError(error.message);
      toastAlert.error(error.message);
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

  console.debug("🎯 Page State:", {
    eventId,
    hasCurrentEvent: !!currentEvent,
    formDataTitle: formData.eventTitle,
    isLoadingEvent,
    isSubmitting,
    error,
  });

  // ========== RENDER LOGIC ==========
  if (isLoadingEvent) {
    return (
      <LoadingSpinner
        message="Loading event data..."
        size="lg"
        color="indigo"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 sm:px-6 lg:px-8">
      {error && (
        <div className="bg-red-900/10 border border-red-500 text-red-300 p-3 mb-4 rounded-lg">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <CreateEventForm
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
        onBack={handleBack}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        mode={eventId ? "edit" : "create"}
        isEditMode={!!eventId}
      />
    </div>
  );
}
