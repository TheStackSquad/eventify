//src/components/account/loginForm.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";

// --- 1. Setup Mocks ---

// Mocking Next.js Navigation (useRouter)
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ children, href }) => <a href={href}>{children}</a>,
}));

// Mocking Redux hooks
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
}));

// Mock the Redux Thunk action creator
jest.mock("@/redux/action/actionAuth", () => ({
  signinUser: jest.fn(),
}));

// Mocking the imported LoginInputField component
jest.mock("@/components/common/loginInputFields", () => ({
  LoginInputField: ({
    value,
    onChange,
    placeholder,
    type,
    isPassword,
    togglePasswordVisibility,
    ...props
  }) => {
    const inputId = `input-${placeholder.toLowerCase().replace(/\s/g, "-")}`;

    // Filter out non-DOM props before spreading
    const { icon, showPassword, ...domProps } = props;

    return (
      <div data-testid={`field-${inputId}`}>
        <input
          id={inputId}
          data-testid={inputId}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          {...domProps}
        />
        {isPassword && (
          <button
            data-testid="toggle-password-btn"
            onClick={togglePasswordVisibility}
          >
            Toggle
          </button>
        )}
      </div>
    );
  },
}));

describe("LoginForm", () => {
  let mockSigninUser;

  beforeEach(() => {
    // Import the mocked function
    mockSigninUser = require("@/redux/action/actionAuth").signinUser;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  const setup = () => render(<LoginForm />);

  const fillForm = async (user) => {
    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    return { emailInput, passwordInput };
  };

  // --- 2. Render and Initial State Tests ---

  it("renders the login form elements correctly", () => {
    setup();

    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Forgot Password\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Remember me/i)).toBeInTheDocument();
  });

  // --- 3. Interaction Tests ---

  it("updates email and password inputs correctly", async () => {
    const user = userEvent.setup();
    setup();

    const emailInput = screen.getByPlaceholderText(/Email address/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("toggles password visibility when the button is clicked", async () => {
    const user = userEvent.setup();
    setup();

    const passwordInput = screen.getByPlaceholderText(/Password/i);
    const toggleButton = screen.getByTestId("toggle-password-btn");

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // --- 4. Submission & Redux Logic Tests ---

  it("handles successful login and redirects to the dashboard", async () => {
    const user = userEvent.setup();
    setup();

    // ✅ FIX: Mock dispatch to return the thunk result with unwrap
    const mockUnwrap = jest.fn().mockResolvedValue({ success: true });
    mockDispatch.mockReturnValue({
      unwrap: mockUnwrap,
    });

    await fillForm(user);

    const loginButton = screen.getByRole("button", { name: /Login/i });
    await user.click(loginButton);

    // Wait for async operations
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockUnwrap).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    expect(loginButton).not.toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("handles login failure and displays the error message", async () => {
    const user = userEvent.setup();
    setup();

    const errorMessage = "Invalid credentials. Please try again.";

    // ✅ FIX: Mock dispatch to return rejected promise
    const mockUnwrap = jest.fn().mockRejectedValue({ message: errorMessage });
    mockDispatch.mockReturnValue({
      unwrap: mockUnwrap,
    });

    await fillForm(user);

    const loginButton = screen.getByRole("button", { name: /Login/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();

      const errorAlert = screen.getByRole("alert");
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent(errorMessage);
    });

    expect(loginButton).not.toBeDisabled();
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    setup();

    // ✅ FIX: Mock dispatch to return a never-resolving promise to keep loading
    const neverResolvingPromise = new Promise(() => {});
    const mockUnwrap = jest.fn().mockReturnValue(neverResolvingPromise);
    mockDispatch.mockReturnValue({
      unwrap: mockUnwrap,
    });

    await fillForm(user);

    const loginButton = screen.getByRole("button", { name: /Login/i });

    // Click and immediately check loading state
    await user.click(loginButton);

    // The button should be disabled while loading
    await waitFor(() => {
      expect(loginButton).toBeDisabled();
    });
  });
});
