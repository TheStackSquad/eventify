// frontend/src/components/account/signUp.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import SignUpForm from "./signUp";
import { signupUser } from "@/redux/action/actionAuth";
import { validateSignup } from "@/utils/validate/signupValidation";
import toastAlert from "@/components/common/toast/toastAlert";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));

jest.mock("@/redux/action/actionAuth", () => ({
  signupUser: jest.fn(),
}));

jest.mock("@/utils/validate/signupValidation", () => ({
  validateSignup: jest.fn(),
}));

jest.mock("@/components/common/toast/toastAlert", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("@/components/common/inputFields", () => {
  return function MockInputField({
    label,
    name,
    type,
    value,
    onChange,
    placeholder,
    error,
    isPassword,
    onToggleVisibility,
    showPassword,
  }) {
    return (
      <div data-testid={`input-field-${name}`}>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={`input-${name}`}
        />
        {error && <span data-testid={`error-${name}`}>{error}</span>}
        {isPassword && (
          <button
            type="button"
            onClick={onToggleVisibility}
            data-testid={`toggle-${name}`}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
    );
  };
});

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  User: () => "UserIcon",
  Mail: () => "MailIcon",
  Lock: () => "LockIcon",
}));

describe("SignUpForm", () => {
  const mockPush = jest.fn();
  let mockDispatch;

  // Helper to create mock dispatch with unwrap
  const createMockDispatch = (result) => {
    const mockPromise =
      result instanceof Error
        ? Promise.reject(result)
        : Promise.resolve(result);

    mockPromise.unwrap = () => mockPromise;
    const dispatchFn = jest.fn().mockReturnValue(mockPromise);
    return dispatchFn;
  };

  beforeEach(() => {
    mockDispatch = createMockDispatch();
    useRouter.mockReturnValue({
      push: mockPush,
    });
    useDispatch.mockReturnValue(mockDispatch);
    jest.clearAllMocks();
  });

  const fillForm = (overrides = {}) => {
    const defaultData = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      ...overrides,
    };

    fireEvent.change(screen.getByTestId("input-name"), {
      target: { value: defaultData.name },
    });
    fireEvent.change(screen.getByTestId("input-email"), {
      target: { value: defaultData.email },
    });
    fireEvent.change(screen.getByTestId("input-password"), {
      target: { value: defaultData.password },
    });
    fireEvent.change(screen.getByTestId("input-confirmPassword"), {
      target: { value: defaultData.confirmPassword },
    });

    return defaultData;
  };

  describe("Rendering", () => {
    it("renders the sign up form with all fields", () => {
      render(<SignUpForm />);

      expect(
        screen.getByRole("heading", { name: "Create Account" })
      ).toBeInTheDocument();
      // Use the exact text that appears in the component
      expect(
        screen.getByText("Create a new account to get started and enjoy")
      ).toBeInTheDocument();
      expect(screen.getByTestId("input-name")).toBeInTheDocument();
      expect(screen.getByTestId("input-email")).toBeInTheDocument();
      expect(screen.getByTestId("input-password")).toBeInTheDocument();
      expect(screen.getByTestId("input-confirmPassword")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create account/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Already have an account?")).toBeInTheDocument();
      expect(screen.getByText("Sign in here")).toBeInTheDocument();
    });

  it("shows loading state when submitting", () => {
    render(<SignUpForm />);

    // Mock validateSignup to return empty object (no validation errors)
    validateSignup.mockReturnValue({});

    // Mock the dispatch to return a pending promise
    const pendingPromise = new Promise(() => {});
    pendingPromise.unwrap = () => pendingPromise;
    mockDispatch.mockReturnValue(pendingPromise);

    fillForm();

    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    // Check for loading spinner instead of text absence
    expect(submitButton.querySelector("svg")).toBeInTheDocument(); // Loading spinner
    // The button text should be replaced by spinner, so it shouldn't have the original text
    expect(submitButton).not.toHaveTextContent(/^Create Account$/);
  });
  });

  describe("Form Validation", () => {
    it("shows validation errors when form is invalid", async () => {
      const validationErrors = {
        name: "Name is required",
        email: "Invalid email",
        password: "Password too weak",
      };

      // Ensure this returns an object, not undefined
      validateSignup.mockReturnValue(validationErrors);

      render(<SignUpForm />);

      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(validateSignup).toHaveBeenCalled();
        expect(screen.getByTestId("error-name")).toHaveTextContent(
          "Name is required"
        );
        expect(screen.getByTestId("error-email")).toHaveTextContent(
          "Invalid email"
        );
        expect(screen.getByTestId("error-password")).toHaveTextContent(
          "Password too weak"
        );
      });
    });

    it("clears field error when user starts typing", async () => {
      const validationErrors = { name: "Name is required" };
      validateSignup.mockReturnValue(validationErrors);

      render(<SignUpForm />);

      // Submit to show error
      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-name")).toHaveTextContent(
          "Name is required"
        );
      });

      // Start typing in the name field
      fireEvent.change(screen.getByTestId("input-name"), {
        target: { value: "John" },
      });

      // Error should be cleared
      expect(screen.queryByTestId("error-name")).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("submits form successfully with valid data", async () => {
      validateSignup.mockReturnValue({}); // No validation errors

      render(<SignUpForm />);
      fillForm();

      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(validateSignup).toHaveBeenCalledWith({
          name: "John Doe",
          email: "john@example.com",
          password: "Password123!",
          confirmPassword: "Password123!",
        });
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          signupUser({
            name: "John Doe",
            email: "john@example.com",
            password: "Password123!",
            confirmPassword: "Password123!",
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/account/auth/login?signup=success"
        );
      });
    });

    it("handles signup failure", async () => {
      const errorMessage = "Email already exists";
      validateSignup.mockReturnValue({});

      // Create a mock dispatch that rejects
      const rejectingDispatch = createMockDispatch(new Error(errorMessage));
      useDispatch.mockReturnValue(rejectingDispatch);

      render(<SignUpForm />);
      fillForm();

      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toastAlert.error).toHaveBeenCalledWith(errorMessage);
      });

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("handles API error with message", async () => {
      const errorMessage = "Network error";
      validateSignup.mockReturnValue({});

      // Create a mock dispatch that rejects with error object
      const rejectingDispatch = createMockDispatch(new Error(errorMessage));
      useDispatch.mockReturnValue(rejectingDispatch);

      render(<SignUpForm />);
      fillForm();

      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toastAlert.error).toHaveBeenCalledWith(errorMessage);
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe("Password Visibility", () => {
    it("toggles password visibility", () => {
      render(<SignUpForm />);

      const passwordToggle = screen.getByTestId("toggle-password");
      const confirmPasswordToggle = screen.getByTestId(
        "toggle-confirmPassword"
      );

      // Initially should show password type
      expect(screen.getByTestId("input-password")).toHaveAttribute(
        "type",
        "password"
      );
      expect(screen.getByTestId("input-confirmPassword")).toHaveAttribute(
        "type",
        "password"
      );

      // Toggle password visibility
      fireEvent.click(passwordToggle);
      expect(screen.getByTestId("input-password")).toHaveAttribute(
        "type",
        "text"
      );

      // Toggle confirm password visibility
      fireEvent.click(confirmPasswordToggle);
      expect(screen.getByTestId("input-confirmPassword")).toHaveAttribute(
        "type",
        "text"
      );
    });
  });
});
