// frontend/src/redux/action/eventAction.test.js

import configureMockStore from "redux-mock-store";
import { thunk } from "redux-thunk";
import axios from "@/axiosConfig/axios"; // Assuming this is the mocked axios or actual
import {
  createEvent,
  fetchUserEvents,
  fetchAllEvents,
  fetchEventAnalytics,
  getEventById,
  updateEvent,
  deleteEvent,
  publishEvent,
} from "./eventAction";
import toastAlert from "@/components/common/toast/toastAlert";
import {
  REDUX_ACTION_TYPES,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/utils/constants/globalConstants";

// --- Setup Mocks ---
jest.mock("@/axiosConfig/axios", () => ({
  // Mock the request methods used in your actions
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  // Crucially, mock isCancel as a function
  isCancel: jest.fn(),
  // Include any other properties/methods your implementation uses (like isAxiosError)
}));
// --- Refactored Toast Mock ---
// --- Refactored Toast Mock ---
jest.mock("@/components/common/toast/toastAlert", () => {
    // 1. Create a mock function to represent the default export (toastAlert)
    const mockToastAlert = jest.fn();

    // 2. Attach the named exports (success, error) as separate mock functions
    mockToastAlert.success = jest.fn();
    mockToastAlert.error = jest.fn();

    // 3. Implement the behavior for the default export (used only by publishEvent)
    // When the default toastAlert(type, message) is called:
    mockToastAlert.mockImplementation((type, message) => {
        // We ensure the correct named mock is called for tracking
        if (type === 'success') {
            mockToastAlert.success(message);
        } else if (type === 'error') {
            mockToastAlert.error(message);
        }
    });

    // 4. Return the function mock as the module's export
    return mockToastAlert; 
});

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

// Mock the console.log for clean test output
global.console = {
  ...global.console,
  log: jest.fn(),
};

// Mock AbortController for signal tests
const mockSignal = {
  aborted: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

// Mocking axios.isCancel for the handleAbortError utility
axios.isCancel.mockImplementation((error) => error && error.isCancel);

// Mock server response data
const mockEvent = {
  _id: "e123",
  title: "Test Event",
  creator: "u456",
};
const mockAnalytics = {
  totalViews: 100,
  uniqueAttendees: 50,
};

describe("Event Redux Actions", () => {
  let store;

  beforeEach(() => {
    store = mockStore({});
    jest.clearAllMocks(); // Clear call history before each test
  });

  // --- Utility Test Case: Abort/Cancel Error Handling ---
  const testAbortHandling = async (action, apiMock, endpoint) => {
    const abortError = new Error("Request aborted");
    abortError.name = "AbortError";
    apiMock.mockRejectedValueOnce(abortError);

    const result = await store.dispatch(
      action({ eventId: "e123", signal: mockSignal })
    );

    // Assert that the action was rejected with the specific abort message
    expect(result.type).toBe(action.rejected.type);
    expect(result.payload).toEqual({
      message: "Request aborted",
      isAborted: true,
    });

    // Check that toastAlert was NOT called for an abort
    expect(toastAlert.success).not.toHaveBeenCalled();
    expect(toastAlert.error).not.toHaveBeenCalled();
  };

  // ----------------------------------------------------------------
  // 1. createEvent
  // ----------------------------------------------------------------
  describe("createEvent", () => {
    const endpoint = API_ENDPOINTS.EVENTS.CREATE;
    const eventData = { title: "New Event" };

    it("should handle successful event creation", async () => {
      axios.post.mockResolvedValueOnce({
        data: mockEvent,
      });

      const result = await store.dispatch(
        createEvent({ eventData, signal: mockSignal })
      );

      expect(axios.post).toHaveBeenCalledWith(endpoint, eventData, {
        signal: mockSignal,
      });
      expect(result.type).toBe(createEvent.fulfilled.type);
      expect(result.payload).toEqual(mockEvent);
      expect(toastAlert.success).toHaveBeenCalledWith(
        SUCCESS_MESSAGES.EVENT_CREATED
      );
    });

    it("should handle API failure with server message", async () => {
      const serverMessage = "Server error during creation";

      // 🚨 REFACTOR: Mock the full Axios error structure 🚨
      axios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: serverMessage,
          },
          // Include status for robustness if needed, but data.message is key
          status: 400,
        },
      });
      // ----------------------------------------------------

      const result = await store.dispatch(
        createEvent({ eventData, signal: mockSignal })
      );

      expect(result.type).toBe(createEvent.rejected.type);
      expect(result.payload).toEqual({
        message: serverMessage,
      });
      expect(toastAlert.error).toHaveBeenCalledWith(serverMessage);
    });
    
    it("should handle abort error gracefully", async () => {
      await testAbortHandling(createEvent, axios.post, endpoint);
    });
  });

  // ----------------------------------------------------------------
  // 2. fetchUserEvents
  // ----------------------------------------------------------------
  describe("fetchUserEvents", () => {
    const endpoint = API_ENDPOINTS.EVENTS.MY_EVENTS;

    it("should fetch user events successfully", async () => {
      axios.get.mockResolvedValueOnce({
        data: [mockEvent],
      });

      const result = await store.dispatch(fetchUserEvents(mockSignal));

      expect(axios.get).toHaveBeenCalledWith(endpoint, {
        signal: mockSignal,
      });
      expect(result.type).toBe(fetchUserEvents.fulfilled.type);
      expect(result.payload).toEqual([mockEvent]);
    });

    it("should handle general fetch failure", async () => {
      axios.get.mockRejectedValueOnce({}); // Generic error

      const result = await store.dispatch(fetchUserEvents(mockSignal));

      expect(result.type).toBe(fetchUserEvents.rejected.type);
      expect(result.payload).toEqual({
        message: ERROR_MESSAGES.FETCH_EVENTS_FAILED,
      });
    });

    it("should handle abort error gracefully", async () => {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      axios.get.mockRejectedValueOnce(abortError);

      const result = await store.dispatch(fetchUserEvents(mockSignal));

      expect(result.type).toBe(fetchUserEvents.rejected.type);
      expect(result.payload).toEqual({
        message: "Request aborted",
        isAborted: true,
      });
    });
  });

  // ----------------------------------------------------------------
  // 3. fetchAllEvents
  // ----------------------------------------------------------------
  describe("fetchAllEvents", () => {
    const endpoint = API_ENDPOINTS.EVENTS.BASE;

    it("should fetch all events successfully", async () => {
      axios.get.mockResolvedValueOnce({
        data: [mockEvent, { ...mockEvent, _id: "e124" }],
      });

      const result = await store.dispatch(fetchAllEvents(mockSignal));

      expect(axios.get).toHaveBeenCalledWith(endpoint, {
        signal: mockSignal,
      });
      expect(result.type).toBe(fetchAllEvents.fulfilled.type);
      expect(result.payload.length).toBe(2);
    });

    it("should handle abort error gracefully", async () => {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      axios.get.mockRejectedValueOnce(abortError);

      const result = await store.dispatch(fetchAllEvents(mockSignal));

      expect(result.type).toBe(fetchAllEvents.rejected.type);
      expect(result.payload).toEqual({
        message: "Request aborted",
        isAborted: true,
      });
    });
  });

  // ----------------------------------------------------------------
  // 4. fetchEventAnalytics
  // ----------------------------------------------------------------
  describe("fetchEventAnalytics", () => {
    const eventId = "e123";
    const endpoint = API_ENDPOINTS.EVENTS.ANALYTICS.replace(":id", eventId);

    it("should fetch event analytics successfully", async () => {
      axios.get.mockResolvedValueOnce({
        data: mockAnalytics,
      });

      const result = await store.dispatch(
        fetchEventAnalytics({ eventId, signal: mockSignal })
      );

      expect(axios.get).toHaveBeenCalledWith(endpoint, {
        signal: mockSignal,
      });
      expect(result.type).toBe(fetchEventAnalytics.fulfilled.type);
      expect(result.payload).toEqual(mockAnalytics);
    });

    it("should handle general failure", async () => {
      axios.get.mockRejectedValueOnce({}); // Generic error

      const result = await store.dispatch(
        fetchEventAnalytics({ eventId, signal: mockSignal })
      );

      expect(result.type).toBe(fetchEventAnalytics.rejected.type);
      expect(result.payload).toEqual({
        message: ERROR_MESSAGES.FETCH_ANALYTICS_FAILED,
      });
    });

    it("should handle abort error gracefully", async () => {
      await testAbortHandling(fetchEventAnalytics, axios.get, endpoint);
    });
  });

  // ----------------------------------------------------------------
  // 5. getEventById
  // ----------------------------------------------------------------
  describe("getEventById", () => {
    const eventId = "e123";
    const endpoint = API_ENDPOINTS.EVENTS.GET_BY_ID.replace(
      ":eventId",
      eventId
    );

    it("should fetch event by ID successfully", async () => {
      axios.get.mockResolvedValueOnce({
        data: mockEvent,
      });

      const result = await store.dispatch(
        getEventById({ eventId, signal: mockSignal })
      );

      expect(axios.get).toHaveBeenCalledWith(endpoint, {
        signal: mockSignal,
      });
      expect(result.type).toBe(getEventById.fulfilled.type);
      expect(result.payload).toEqual(mockEvent);
      expect(global.console.log).toHaveBeenCalledWith(
        "🔍 Fetching event from:",
        endpoint
      );
    });

    it("should handle API failure and show toast", async () => {
      const serverMessage = "Event not found";
      axios.get.mockRejectedValueOnce({
        response: {
          data: {
            message: serverMessage,
          },
        },
      });

      const result = await store.dispatch(
        getEventById({ eventId, signal: mockSignal })
      );

      expect(result.type).toBe(getEventById.rejected.type);
      expect(result.payload).toEqual({
        message: serverMessage,
      });
      expect(toastAlert.error).toHaveBeenCalledWith(serverMessage);
    });

    it("should handle abort error gracefully", async () => {
      await testAbortHandling(getEventById, axios.get, endpoint);
    });
  });

  // ----------------------------------------------------------------
  // 6. updateEvent
  // ----------------------------------------------------------------
  describe("updateEvent", () => {
    const eventId = "e123";
    const updates = {
      title: "Updated Title",
    };
    const endpoint = API_ENDPOINTS.EVENTS.UPDATE.replace(":id", eventId);
    const updatedEvent = {
      ...mockEvent,
      ...updates,
    };

    it("should handle successful event update", async () => {
      axios.put.mockResolvedValueOnce({
        data: updatedEvent,
      });

      const result = await store.dispatch(
        updateEvent({ eventId, updates, signal: mockSignal })
      );

      expect(axios.put).toHaveBeenCalledWith(endpoint, updates, {
        signal: mockSignal,
      });
      expect(result.type).toBe(updateEvent.fulfilled.type);
      expect(result.payload).toEqual(updatedEvent);
      expect(toastAlert.success).toHaveBeenCalledWith(
        SUCCESS_MESSAGES.EVENT_UPDATED
      );
    });

    it("should handle API failure and show toast", async () => {
      const serverMessage = "Update failed";
      axios.put.mockRejectedValueOnce({
        response: {
          data: {
            message: serverMessage,
          },
        },
      });

      const result = await store.dispatch(
        updateEvent({ eventId, updates, signal: mockSignal })
      );

      expect(result.type).toBe(updateEvent.rejected.type);
      expect(result.payload).toEqual({
        message: serverMessage,
      });
      expect(toastAlert.error).toHaveBeenCalledWith(serverMessage);
    });

    it("should handle abort error gracefully", async () => {
      await testAbortHandling(updateEvent, axios.put, endpoint);
    });
  });

  // ----------------------------------------------------------------
  // 7. deleteEvent
  // ----------------------------------------------------------------
  describe("deleteEvent", () => {
    const eventId = "e123";
    const endpoint = API_ENDPOINTS.EVENTS.DELETE.replace(":id", eventId);

    it("should handle successful event deletion", async () => {
      axios.delete.mockResolvedValueOnce({});

      const result = await store.dispatch(
        deleteEvent({ eventId, signal: mockSignal })
      );

      expect(axios.delete).toHaveBeenCalledWith(endpoint, {
        signal: mockSignal,
      });
      expect(result.type).toBe(deleteEvent.fulfilled.type);
      // Returns the deleted eventId for reducer to handle
      expect(result.payload).toEqual({
        eventId,
      });
      expect(toastAlert.success).toHaveBeenCalledWith(
        SUCCESS_MESSAGES.EVENT_DELETED
      );
    });

    it("should handle API failure and show toast", async () => {
      const serverMessage = "Deletion failed";
      axios.delete.mockRejectedValueOnce({
        response: {
          data: {
            message: serverMessage,
          },
        },
      });

      const result = await store.dispatch(
        deleteEvent({ eventId, signal: mockSignal })
      );

      expect(result.type).toBe(deleteEvent.rejected.type);
      expect(result.payload).toEqual({
        message: serverMessage,
      });
      expect(toastAlert.error).toHaveBeenCalledWith(serverMessage);
    });

    it("should handle abort error gracefully", async () => {
      await testAbortHandling(deleteEvent, axios.delete, endpoint);
    });
  });

  // ----------------------------------------------------------------
  // 8. publishEvent
  // ----------------------------------------------------------------
  describe("publishEvent", () => {
    const eventId = "e123";
    const endpoint = `/events/${eventId}/publish`;
    const publishedEvent = {
      ...mockEvent,
      isPublished: true,
    };

    it("should handle successful event publish (true)", async () => {
      axios.patch.mockResolvedValueOnce({
        data: publishedEvent,
      });
      const isPublished = true;

      const result = await store.dispatch(
        publishEvent({ eventId, isPublished, signal: mockSignal })
      );

      expect(axios.patch).toHaveBeenCalledWith(
        endpoint,
        {
          isPublished,
        },
        {
          signal: mockSignal,
        }
      );
      expect(result.type).toBe(publishEvent.fulfilled.type);
      expect(result.payload).toEqual(publishedEvent);
      expect(toastAlert).toHaveBeenCalledWith("success", "Event published! 🚀");
    });

    it("should handle successful event unpublish (false)", async () => {
      axios.patch.mockResolvedValueOnce({
        data: {
          ...publishedEvent,
          isPublished: false,
        },
      });
      const isPublished = false;

      const result = await store.dispatch(
        publishEvent({ eventId, isPublished, signal: mockSignal })
      );

      expect(result.type).toBe(publishEvent.fulfilled.type);
      expect(toastAlert).toHaveBeenCalledWith("success", "Event unpublished");
    });

    it("should handle API failure and show toast", async () => {
      const serverMessage = "Publish status update failed";
      axios.patch.mockRejectedValueOnce({
        response: {
          data: {
            message: serverMessage,
          },
        },
      });

      const result = await store.dispatch(
        publishEvent({ eventId, isPublished: true, signal: mockSignal })
      );

      expect(result.type).toBe(publishEvent.rejected.type);
      expect(result.payload).toEqual({
        message: serverMessage,
      });
      expect(toastAlert.error).toHaveBeenCalledWith(serverMessage);
    });

    it("should handle abort error gracefully", async () => {
      await testAbortHandling(publishEvent, axios.patch, endpoint);
    });
  });
});
