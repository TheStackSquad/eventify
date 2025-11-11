// frontend/src/components/onboarding/feedbackModal.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackModal from "./feedbackModal";
import { createFeedback } from "@/redux/action/feedbackAction";
import feedbackValidate from "@/utils/validate/feedbackValidate";
import toastAlert from "@/components/common/toast/toastAlert";

// Mock dependencies
jest.mock("@/redux/action/feedbackAction");
jest.mock("@/utils/validate/feedbackValidate");
jest.mock("@/components/common/toast/toastAlert");
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => <img {...props} alt={props.alt} />,
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, onClick, className, ...props }) => (
      <div onClick={onClick} className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock react-redux
jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
}));

// Mock fetch for image upload
global.fetch = jest.fn();

// Global variable to hold the spy
let consoleErrorSpy;

describe("FeedbackModal - Critical Tests", () => {
  // 1. Silence console.error for the entire test suite
  beforeAll(() => {
    // Spy on console.error and replace it with an empty function
    // This prevents the intentional error logs in 'Form Submission' tests from polluting the output.
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // 2. Restore the original console.error implementation after all tests
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });
  
  let mockOnClose;
  let mockDispatch;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockDispatch = jest.fn();

    // Mock useDispatch to return our mock
    require("react-redux").useDispatch = () => mockDispatch;

    jest.clearAllMocks();

    // Default validation mock
    feedbackValidate.mockReturnValue({ isValid: true, errors: {} });

    // Default fetch mock for image upload
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://example.com/image.jpg" }),
    });

    // Default createFeedback mock
    mockDispatch.mockResolvedValue({ success: true });
  });

  const renderComponent = (isOpen = true) => {
    return render(<FeedbackModal isOpen={isOpen} onClose={mockOnClose} />);
  };

  describe("Modal Visibility", () => {
    it("should not render when isOpen is false", () => {
      renderComponent(false);
      expect(screen.queryByText("Share Your Feedback")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      renderComponent();
      expect(screen.getByText("Share Your Feedback")).toBeInTheDocument();
    });
  });

  describe("Close Functionality", () => {
    it("should close modal when close button is clicked", () => {
      renderComponent();
      const closeButton = screen.getByLabelText("Close modal");
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should close modal when cancel button is clicked", () => {
      renderComponent();
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Form Input", () => {
    it("should update form fields when user types", async () => {
      await act(async () => {
        renderComponent();
      });

      const nameInput = screen.getByPlaceholderText("Your name");
      const emailInput = screen.getByPlaceholderText("your.email@example.com");
      const messageInput = screen.getByPlaceholderText(
        "Tell us what's on your mind..."
      );

      await act(async () => {
        await userEvent.type(nameInput, "John Doe");
        await userEvent.type(emailInput, "john@example.com");
        await userEvent.type(messageInput, "Great app!");
      });

      expect(nameInput.value).toBe("John Doe");
      expect(emailInput.value).toBe("john@example.com");
      expect(messageInput.value).toBe("Great app!");
    });

    it("should change feedback type", async () => {
      await act(async () => {
        renderComponent();
      });

      const select = screen.getByRole("combobox");

      await act(async () => {
        await userEvent.selectOptions(select, "complaint");
      });

      expect(select.value).toBe("complaint");
    });
  });

  describe("Form Validation", () => {
    it("should display validation errors when form is invalid", async () => {
      feedbackValidate.mockReturnValue({
        isValid: false,
        errors: {
          name: "Name is required",
          email: "Email is required",
          message: "Message is required",
        },
      });

      await act(async () => {
        renderComponent();
      });

      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
        expect(screen.getByText("Email is required")).toBeInTheDocument();
        expect(screen.getByText("Message is required")).toBeInTheDocument();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should clear field error when user starts typing", async () => {
      feedbackValidate.mockReturnValue({
        isValid: false,
        errors: { name: "Name is required" },
      });

      await act(async () => {
        renderComponent();
      });

      const nameInput = screen.getByPlaceholderText("Your name");
      const submitButton = screen.getByText("Submit Feedback");

      // Trigger validation error
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });

      // Type to clear error
      await act(async () => {
        await userEvent.type(nameInput, "J");
      });

      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });

    it("should not submit when validation fails", async () => {
      feedbackValidate.mockReturnValue({
        isValid: false,
        errors: { name: "Name is required" },
      });

      await act(async () => {
        renderComponent();
      });

      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(feedbackValidate).toHaveBeenCalled();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("Image Upload", () => {
    it("should show error for files larger than 5MB", async () => {
      await act(async () => {
        renderComponent();
      });

      const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.png", {
        type: "image/png",
      });

      const fileInput = document.querySelector('input[type="file"]');

      Object.defineProperty(fileInput, "files", {
        value: [largeFile],
        configurable: true,
      });

      await act(async () => {
        fireEvent.change(fileInput);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Image size should be less than 5MB")
        ).toBeInTheDocument();
      });
    });

    it("should display image preview when file is selected", async () => {
      await act(async () => {
        renderComponent();
      });

      const file = new File(["image"], "test.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]');

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null,
        result: "data:image/png;base64,mockbase64",
      };

      global.FileReader = jest.fn(() => mockFileReader);

      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });

      await act(async () => {
        fireEvent.change(fileInput);
      });

      // Simulate FileReader completion
      await act(async () => {
        mockFileReader.onloadend();
      });

      await waitFor(() => {
        expect(screen.getByAltText("Preview")).toBeInTheDocument();
      });
    });

    it("should show filename when image is selected", async () => {
      await act(async () => {
        renderComponent();
      });

      const file = new File(["image"], "test.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]');

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null,
        result: "data:image/png;base64,mockbase64",
      };

      global.FileReader = jest.fn(() => mockFileReader);

      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });

      await act(async () => {
        fireEvent.change(fileInput);
      });

      await act(async () => {
        mockFileReader.onloadend();
      });

      await waitFor(() => {
        expect(screen.getByText("test.png")).toBeInTheDocument();
      });
    });

    it("should remove image when delete button is clicked", async () => {
      await act(async () => {
        renderComponent();
      });

      const file = new File(["image"], "test.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]');

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null,
        result: "data:image/png;base64,mockbase64",
      };

      global.FileReader = jest.fn(() => mockFileReader);

      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });

      await act(async () => {
        fireEvent.change(fileInput);
      });

      await act(async () => {
        mockFileReader.onloadend();
      });

      await waitFor(() => {
        expect(screen.getByAltText("Preview")).toBeInTheDocument();
      });

      // Find and click the remove button (red X button on the image)
      const removeButtons = screen.getAllByRole("button");
      const removeImageButton = removeButtons.find((btn) =>
        btn.className.includes("bg-red-500")
      );

      await act(async () => {
        fireEvent.click(removeImageButton);
      });

      await waitFor(() => {
        expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should submit feedback successfully without image", async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({ success: true });
      createFeedback.mockReturnValue({ unwrap: mockUnwrap });
      mockDispatch.mockReturnValue({ unwrap: mockUnwrap });

      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        await userEvent.type(
          screen.getByPlaceholderText("Your name"),
          "John Doe"
        );
        await userEvent.type(
          screen.getByPlaceholderText("your.email@example.com"),
          "john@example.com"
        );
        await userEvent.type(
          screen.getByPlaceholderText("Tell us what's on your mind..."),
          "Great app!"
        );
      });

      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(createFeedback).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "John Doe",
            email: "john@example.com",
            message: "Great app!",
            type: "suggestion",
            imageUrl: "",
          })
        );
      });

      await waitFor(() => {
        expect(toastAlert.success).toHaveBeenCalledWith(
          "Thank you for your feedback! We'll review it shortly."
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should show loading state during submission", async () => {
      const mockUnwrap = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ success: true }), 100)
            )
        );
      createFeedback.mockReturnValue({ unwrap: mockUnwrap });
      mockDispatch.mockReturnValue({ unwrap: mockUnwrap });

      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        await userEvent.type(
          screen.getByPlaceholderText("Your name"),
          "John Doe"
        );
        await userEvent.type(
          screen.getByPlaceholderText("your.email@example.com"),
          "john@example.com"
        );
        await userEvent.type(
          screen.getByPlaceholderText("Tell us what's on your mind..."),
          "Great app!"
        );
      });

      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Sending...")).toBeInTheDocument();
      });
    });

    it("should disable form during submission", async () => {
      const mockUnwrap = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ success: true }), 100)
            )
        );
      createFeedback.mockReturnValue({ unwrap: mockUnwrap });
      mockDispatch.mockReturnValue({ unwrap: mockUnwrap });

      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        await userEvent.type(
          screen.getByPlaceholderText("Your name"),
          "John Doe"
        );
        await userEvent.type(
          screen.getByPlaceholderText("your.email@example.com"),
          "john@example.com"
        );
        await userEvent.type(
          screen.getByPlaceholderText("Tell us what's on your mind..."),
          "Great app!"
        );
      });

      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText("Cancel")).toBeDisabled();
      });
    });

    it("should handle submission error", async () => {
      const mockUnwrap = jest.fn().mockRejectedValue("Submission failed");
      createFeedback.mockReturnValue({ unwrap: mockUnwrap });
      mockDispatch.mockReturnValue({ unwrap: mockUnwrap });

      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        await userEvent.type(
          screen.getByPlaceholderText("Your name"),
          "John Doe"
        );
        await userEvent.type(
          screen.getByPlaceholderText("your.email@example.com"),
          "john@example.com"
        );
        await userEvent.type(
          screen.getByPlaceholderText("Tell us what's on your mind..."),
          "Great app!"
        );
      });

      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        // The error message shows the actual error value: "Submission failed"
        expect(screen.getByText("Submission failed")).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should show fallback error message when error is falsy", async () => {
      const mockUnwrap = jest.fn().mockRejectedValue(null);
      createFeedback.mockReturnValue({ unwrap: mockUnwrap });
      mockDispatch.mockReturnValue({ unwrap: mockUnwrap });

      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        await userEvent.type(
          screen.getByPlaceholderText("Your name"),
          "John Doe"
        );
        await userEvent.type(
          screen.getByPlaceholderText("your.email@example.com"),
          "john@example.com"
        );
        await userEvent.type(
          screen.getByPlaceholderText("Tell us what's on your mind..."),
          "Great app!"
        );
      });

      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        // When error is falsy, fallback message is shown
        expect(
          screen.getByText("Failed to submit feedback. Please try again.")
        ).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should upload image before submitting feedback", async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({ success: true });
      createFeedback.mockReturnValue({ unwrap: mockUnwrap });
      mockDispatch.mockReturnValue({ unwrap: mockUnwrap });

      await act(async () => {
        renderComponent();
      });

      // Fill form
      await act(async () => {
        await userEvent.type(
          screen.getByPlaceholderText("Your name"),
          "John Doe"
        );
        await userEvent.type(
          screen.getByPlaceholderText("your.email@example.com"),
          "john@example.com"
        );
        await userEvent.type(
          screen.getByPlaceholderText("Tell us what's on your mind..."),
          "Great app!"
        );
      });

      // Add image
      const file = new File(["image"], "test.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]');

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onloadend: null,
        result: "data:image/png;base64,mockbase64",
      };

      global.FileReader = jest.fn(() => mockFileReader);

      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });

      await act(async () => {
        fireEvent.change(fileInput);
      });

      await act(async () => {
        mockFileReader.onloadend();
      });

      await waitFor(() => {
        expect(screen.getByAltText("Preview")).toBeInTheDocument();
      });

      // Submit
      const submitButton = screen.getByText("Submit Feedback");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/feedback-image",
          expect.objectContaining({
            method: "POST",
            body: expect.any(FormData),
          })
        );
      });

      await waitFor(() => {
        expect(createFeedback).toHaveBeenCalledWith(
          expect.objectContaining({
            imageUrl: "https://example.com/image.jpg",
          })
        );
      });
    });
  });
});
