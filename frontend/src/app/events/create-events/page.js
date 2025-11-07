// frontend/src/app/events/create-events/page.js
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

// ✅ OPTIMIZED: Memoized transform function outside component
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
  // ========== STATE MANAGEMENT ==========
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const eventId = searchParams.get("id");

  // ✅ OPTIMIZED: Single useSelector call
  const { user, sessionChecked } = useSelector((state) => state.auth);
  const { currentEvent } = useSelector((state) => state.events);

  // ✅ REMOVED: All authentication guard logic - handled by middleware

  // ✅ OPTIMIZED: Memoized event ID check
  const isEditMode = useMemo(() => !!eventId, [eventId]);

  // ========== EVENT DATA FETCHING ==========
  const fetchEventData = useCallback(async () => {
    if (!eventId) {
      setFormData(INITIAL_FORM_DATA);
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
  }, [eventId, dispatch]);

  // ✅ OPTIMIZED: Fetch event only when session is verified and eventId exists
  useEffect(() => {
    if (sessionChecked && eventId) {
      fetchEventData();
    } else if (sessionChecked && !eventId) {
      setFormData(INITIAL_FORM_DATA);
    }
  }, [sessionChecked, eventId, fetchEventData]);

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
  const handleFormChange = useCallback((updatedFormData) => {
    console.debug("📝 Form data changed:", updatedFormData);
    setFormData(updatedFormData);
  }, []);

  // ✅ OPTIMIZED: Memoized image upload handler
  const handleImageUpload = useCallback(async (imageFile) => {
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
  }, []);

  // ✅ OPTIMIZED: Memoized payload preparation
  const prepareEventPayload = useCallback(
    (formData, imageUrl) => {
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
    },
    [user?.id]
  );

  // ✅ OPTIMIZED: Memoized submit handler
  const handleSubmit = useCallback(
    async (finalFormData) => {
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
    },
    [
      user?.id,
      eventId,
      dispatch,
      handleImageUpload,
      prepareEventPayload,
      router,
    ]
  );

  // ✅ OPTIMIZED: Memoized navigation handlers
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleCancel = useCallback(() => {
    router.push(ROUTES.MY_EVENTS);
  }, [router]);

  // ✅ OPTIMIZED: Debug logging with memoized state
  const debugState = useMemo(
    () => ({
      eventId,
      hasCurrentEvent: !!currentEvent,
      formDataTitle: formData.eventTitle,
      isLoadingEvent,
      isSubmitting,
      error,
      sessionChecked,
      hasUser: !!user,
    }),
    [
      eventId,
      currentEvent,
      formData.eventTitle,
      isLoadingEvent,
      isSubmitting,
      error,
      sessionChecked,
      user,
    ]
  );

  useEffect(() => {
    console.debug("🎯 Page State:", debugState);
  }, [debugState]);

  // ========== RENDER LOGIC ==========

  // ✅ OPTIMIZED: Single loading check using sessionChecked
  const isLoading = !sessionChecked || isLoadingEvent;

  if (isLoading) {
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
        mode={isEditMode ? "edit" : "create"}
        isEditMode={isEditMode}
      />
    </div>
  );
}
