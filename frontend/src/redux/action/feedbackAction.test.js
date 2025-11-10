// frontend/src/redux/action/feedbackAction.test.js
import {
  createFeedback,
  fetchAllFeedback,
  deleteFeedback,
  resetCreateFeedbackStatus,
} from "./feedbackAction";
import axios from "@/axiosConfig/axios";
import globalConstants from "@/utils/constants/globalConstants";

// Mock dependencies
jest.mock("@/axiosConfig/axios");
jest.mock("@/utils/constants/globalConstants");

describe("Feedback Actions", () => {
  const mockAxios = axios;
  const mockGlobalConstants = globalConstants;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock global constants with correct endpoints that include /v1
    mockGlobalConstants.REDUX_ACTION_TYPES = {
      CREATE_FEEDBACK: "feedback/createFeedback",
      FETCH_ALL_FEEDBACK: "feedback/fetchAllFeedback",
      DELETE_FEEDBACK: "feedback/deleteFeedback",
      RESET_CREATE_FEEDBACK_STATUS: "feedback/resetCreateFeedbackStatus",
    };

    mockGlobalConstants.API_ENDPOINTS = {
      FEEDBACK: {
        CREATE: "/api/v1/feedback", // Updated to include /v1
      },
      ADMIN_FEEDBACK: {
        GET_ALL: "/api/v1/admin/feedback", // Updated to include /v1
        DELETE: "/api/v1/admin/feedback/:id", // Updated to include /v1
      },
    };
  });

  describe("createFeedback", () => {
    const mockFeedbackData = {
      name: "John Doe",
      email: "john@example.com",
      type: "suggestion",
      message: "Great app!",
      imageUrl: "https://example.com/image.jpg",
    };

    it("should create feedback successfully", async () => {
      const mockResponse = {
        data: {
          id: "123",
          ...mockFeedbackData,
          createdAt: "2023-01-01T00:00:00Z",
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const thunk = createFeedback(mockFeedbackData);
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(mockAxios.post).toHaveBeenCalledWith(
        "/api/v1/feedback", // Updated expected endpoint
        mockFeedbackData,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      expect(result.type).toBe("feedback/createFeedback/fulfilled");
      expect(result.payload).toEqual(mockResponse.data);
    });

    it("should handle create feedback failure with server error", async () => {
      const mockError = {
        response: {
          data: { error: "Server error occurred" },
        },
      };

      mockAxios.post.mockRejectedValue(mockError);

      const thunk = createFeedback(mockFeedbackData);
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/createFeedback/rejected");
      expect(result.payload).toBe("Server error occurred");
      expect(result.error.message).toBe("Rejected");
    });

    it("should handle create feedback failure with generic error", async () => {
      const mockError = new Error("Network error");
      mockAxios.post.mockRejectedValue(mockError);

      const thunk = createFeedback(mockFeedbackData);
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/createFeedback/rejected");
      expect(result.payload).toBe("Failed to submit feedback");
      expect(result.error.message).toBe("Rejected");
    });

    it("should handle create feedback failure with empty response", async () => {
      const mockError = {
        response: null,
      };

      mockAxios.post.mockRejectedValue(mockError);

      const thunk = createFeedback(mockFeedbackData);
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/createFeedback/rejected");
      expect(result.payload).toBe("Failed to submit feedback");
    });
  });

  describe("fetchAllFeedback", () => {
    it("should fetch all feedback successfully", async () => {
      const mockResponse = {
        data: {
          feedback: [
            {
              id: "1",
              name: "John Doe",
              email: "john@example.com",
              type: "suggestion",
              message: "Great app!",
              createdAt: "2023-01-01T00:00:00Z",
            },
            {
              id: "2",
              name: "Jane Smith",
              email: "jane@example.com",
              type: "complaint",
              message: "Need improvements",
              createdAt: "2023-01-02T00:00:00Z",
            },
          ],
        },
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const thunk = fetchAllFeedback();
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(mockAxios.get).toHaveBeenCalledWith("/api/v1/admin/feedback", {
        // Updated expected endpoint
        withCredentials: true,
      });

      expect(result.type).toBe("feedback/fetchAllFeedback/fulfilled");
      expect(result.payload).toEqual(mockResponse.data.feedback);
    });

    it("should return empty array when no feedback data", async () => {
      const mockResponse = {
        data: {}, // No feedback property
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const thunk = fetchAllFeedback();
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/fetchAllFeedback/fulfilled");
      expect(result.payload).toEqual([]);
    });

    it("should handle fetch all feedback failure with server error", async () => {
      const mockError = {
        response: {
          data: { error: "Unauthorized access" },
        },
      };

      mockAxios.get.mockRejectedValue(mockError);

      const thunk = fetchAllFeedback();
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/fetchAllFeedback/rejected");
      expect(result.payload).toBe("Unauthorized access");
    });

    it("should handle fetch all feedback failure with generic error", async () => {
      const mockError = new Error("Network error");
      mockAxios.get.mockRejectedValue(mockError);

      const thunk = fetchAllFeedback();
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/fetchAllFeedback/rejected");
      expect(result.payload).toBe("Failed to fetch feedback");
    });
  });

  describe("deleteFeedback", () => {
    const feedbackId = "123";

    it("should delete feedback successfully", async () => {
      mockAxios.delete.mockResolvedValue({});

      const thunk = deleteFeedback(feedbackId);
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(mockAxios.delete).toHaveBeenCalledWith(
        "/api/v1/admin/feedback/123",
        {
          // Updated expected endpoint
          withCredentials: true,
        }
      );

      expect(result.type).toBe("feedback/deleteFeedback/fulfilled");
      expect(result.payload).toBe(feedbackId);
    });

    it("should handle delete feedback failure with server error", async () => {
      const mockError = {
        response: {
          data: { error: "Feedback not found" },
        },
      };

      mockAxios.delete.mockRejectedValue(mockError);

      const thunk = deleteFeedback(feedbackId);
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/deleteFeedback/rejected");
      expect(result.payload).toBe("Feedback not found");
    });

    it("should handle delete feedback failure with generic error", async () => {
      const mockError = new Error("Network error");
      mockAxios.delete.mockRejectedValue(mockError);

      const thunk = deleteFeedback(feedbackId);
      const dispatch = jest.fn();
      const getState = jest.fn();

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe("feedback/deleteFeedback/rejected");
      expect(result.payload).toBe("Failed to delete feedback");
    });

    it("should properly replace :id in endpoint", async () => {
      const customId = "abc-123";
      mockAxios.delete.mockResolvedValue({});

      const thunk = deleteFeedback(customId);
      const dispatch = jest.fn();
      const getState = jest.fn();

      await thunk(dispatch, getState, undefined);

      expect(mockAxios.delete).toHaveBeenCalledWith(
        "/api/v1/admin/feedback/abc-123",
        {
          // Updated expected endpoint
          withCredentials: true,
        }
      );
    });
  });

  describe("resetCreateFeedbackStatus", () => {
    it("should return correct action type", () => {
      const action = resetCreateFeedbackStatus();

      expect(action).toEqual({
        type: "feedback/resetCreateFeedbackStatus",
      });
    });

    it("should not have payload", () => {
      const action = resetCreateFeedbackStatus();

      expect(action.payload).toBeUndefined();
    });
  });

  describe("Action Type Constants", () => {
    it("should use correct action types from global constants", () => {
      // Test that the actions use the mocked constants
      expect(createFeedback.typePrefix).toBe("feedback/createFeedback");
      expect(fetchAllFeedback.typePrefix).toBe("feedback/fetchAllFeedback");
      expect(deleteFeedback.typePrefix).toBe("feedback/deleteFeedback");
    });
  });

  describe("Request Configurations", () => {
    it("should include withCredentials in all requests", async () => {
      // Test create feedback
      mockAxios.post.mockResolvedValue({ data: {} });
      const createThunk = createFeedback({});
      await createThunk(jest.fn(), jest.fn(), undefined);
      expect(mockAxios.post).toHaveBeenCalledWith(
        "/api/v1/feedback", // Updated expected endpoint
        expect.any(Object),
        expect.objectContaining({ withCredentials: true })
      );

      // Test fetch all feedback
      mockAxios.get.mockResolvedValue({ data: { feedback: [] } });
      const fetchThunk = fetchAllFeedback();
      await fetchThunk(jest.fn(), jest.fn(), undefined);
      expect(mockAxios.get).toHaveBeenCalledWith(
        "/api/v1/admin/feedback", // Updated expected endpoint
        expect.objectContaining({ withCredentials: true })
      );

      // Test delete feedback
      mockAxios.delete.mockResolvedValue({});
      const deleteThunk = deleteFeedback("123");
      await deleteThunk(jest.fn(), jest.fn(), undefined);
      expect(mockAxios.delete).toHaveBeenCalledWith(
        "/api/v1/admin/feedback/123", // Updated expected endpoint
        expect.objectContaining({ withCredentials: true })
      );
    });

    it("should set correct content type for create feedback", async () => {
      mockAxios.post.mockResolvedValue({ data: {} });
      const thunk = createFeedback({});
      await thunk(jest.fn(), jest.fn(), undefined);

      expect(mockAxios.post).toHaveBeenCalledWith(
        "/api/v1/feedback", // Updated expected endpoint
        expect.any(Object),
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });
});
