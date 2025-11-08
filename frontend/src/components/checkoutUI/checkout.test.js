// frontend/src/components/checkoutUI/checkout.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PaystackCheckout from "./checkout";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    button: ({ children, whileHover, whileTap, ...props }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  CreditCard: () => <span data-testid="credit-card-icon">💳</span>,
  Loader2: () => <span data-testid="loader-icon">🔄</span>,
  AlertTriangle: () => <span data-testid="alert-icon">⚠️</span>,
}));

// Mock the custom hook
jest.mock("@/utils/hooks/usePaystackIntegration", () => ({
  usePaystackIntegration: jest.fn(),
}));

// Import the mocked hook
import { usePaystackIntegration } from "@/utils/hooks/usePaystackIntegration";

describe("PaystackCheckout", () => {
  const mockFormatCurrency = jest.fn((amount) => `₦${amount.toLocaleString()}`);
  const mockHandlePayment = jest.fn();

  const defaultProps = {
    amountInKobo: 500000, // 5000 Naira in kobo
    email: "test@example.com",
    totalAmount: 5000,
    formatCurrency: mockFormatCurrency,
    metadata: {
      eventId: "event-123",
      ticketCount: 2,
    },
  };

  const mockUsePaystackIntegration = (overrides = {}) => {
    const defaultReturn = {
      handlePayment: mockHandlePayment,
      isLoading: false,
      isReady: true,
      ...overrides,
    };
    usePaystackIntegration.mockReturnValue(defaultReturn);
    return defaultReturn;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePaystackIntegration();
  });

  describe("Rendering", () => {
    it("renders payment information correctly", () => {
      render(<PaystackCheckout {...defaultProps} />);

      expect(
        screen.getByText(/You are about to securely pay for tickets worth/)
      ).toBeInTheDocument();
      expect(screen.getByText("₦5,000")).toBeInTheDocument(); // Formatted amount
    });

    it("renders warning alert", () => {
      render(<PaystackCheckout {...defaultProps} />);

      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
      expect(
        screen.getByText(/simulated Paystack integration/)
      ).toBeInTheDocument();
    });

    it("renders pay button when ready", () => {
      render(<PaystackCheckout {...defaultProps} />);

      expect(screen.getByTestId("credit-card-icon")).toBeInTheDocument();
      expect(screen.getByText(/Pay Now ₦5,000/)).toBeInTheDocument();
    });

    it("renders powered by text", () => {
      render(<PaystackCheckout {...defaultProps} />);

      expect(screen.getByText(/Powered by Paystack/)).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it("shows processing state when isLoading is true", () => {
      mockUsePaystackIntegration({ isLoading: true });

      render(<PaystackCheckout {...defaultProps} />);

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
      expect(screen.getByText("Processing Payment...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("shows initializing state when isReady is false", () => {
      mockUsePaystackIntegration({ isReady: false });

      render(<PaystackCheckout {...defaultProps} />);

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
      expect(screen.getByText("Initializing Gateway...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("enables button when ready and not loading", () => {
      mockUsePaystackIntegration({ isLoading: false, isReady: true });

      render(<PaystackCheckout {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent(/Pay Now/);
    });
  });

  describe("User Interactions", () => {
    it("calls handlePayment when pay button is clicked", () => {
      render(<PaystackCheckout {...defaultProps} />);

      const payButton = screen.getByRole("button");
      fireEvent.click(payButton);

      expect(mockHandlePayment).toHaveBeenCalledTimes(1);
    });

    it("does not call handlePayment when button is disabled", () => {
      mockUsePaystackIntegration({ isLoading: true });

      render(<PaystackCheckout {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockHandlePayment).not.toHaveBeenCalled();
    });
  });

  describe("Currency Formatting", () => {
    it("calls formatCurrency with correct amount", () => {
      render(<PaystackCheckout {...defaultProps} />);

      expect(mockFormatCurrency).toHaveBeenCalledWith(5000);
    });

    it("uses custom currency format", () => {
      const customFormat = jest.fn((amount) => `$${amount}`);
      const customProps = {
        ...defaultProps,
        formatCurrency: customFormat,
      };

      render(<PaystackCheckout {...customProps} />);

      expect(customFormat).toHaveBeenCalledWith(5000);
      expect(screen.getByText("$5000")).toBeInTheDocument();
    });
  });

  describe("Hook Integration", () => {
    it("passes correct props to usePaystackIntegration hook", () => {
      render(<PaystackCheckout {...defaultProps} />);

      expect(usePaystackIntegration).toHaveBeenCalledWith({
        amountInKobo: 500000,
        email: "test@example.com",
        metadata: {
          eventId: "event-123",
          ticketCount: 2,
        },
      });
    });

    it("handles hook state changes", () => {
      const { rerender } = render(<PaystackCheckout {...defaultProps} />);

      // Initially should show pay button
      expect(screen.getByText(/Pay Now/)).toBeInTheDocument();

      // Update hook to loading state
      mockUsePaystackIntegration({ isLoading: true });
      rerender(<PaystackCheckout {...defaultProps} />);

      // Should show processing state
      expect(screen.getByText("Processing Payment...")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles zero amount", () => {
      const zeroAmountProps = {
        ...defaultProps,
        amountInKobo: 0,
        totalAmount: 0,
      };

      render(<PaystackCheckout {...zeroAmountProps} />);

      expect(mockFormatCurrency).toHaveBeenCalledWith(0);
      expect(screen.getByText("₦0")).toBeInTheDocument();
    });

    it("handles missing email", () => {
      const noEmailProps = {
        ...defaultProps,
        email: "",
      };

      render(<PaystackCheckout {...noEmailProps} />);

      expect(usePaystackIntegration).toHaveBeenCalledWith({
        amountInKobo: 500000,
        email: "",
        metadata: {
          eventId: "event-123",
          ticketCount: 2,
        },
      });
    });

    it("handles empty metadata", () => {
      const noMetadataProps = {
        ...defaultProps,
        metadata: {},
      };

      render(<PaystackCheckout {...noMetadataProps} />);

      expect(usePaystackIntegration).toHaveBeenCalledWith({
        amountInKobo: 500000,
        email: "test@example.com",
        metadata: {},
      });
    });

    it("handles undefined metadata", () => {
      const undefinedMetadataProps = {
        ...defaultProps,
        metadata: undefined,
      };

      render(<PaystackCheckout {...undefinedMetadataProps} />);

      expect(usePaystackIntegration).toHaveBeenCalledWith({
        amountInKobo: 500000,
        email: "test@example.com",
        metadata: undefined,
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper button states for screen readers", () => {
      render(<PaystackCheckout {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toBeEnabled();
    });

    it("disables button appropriately", () => {
      mockUsePaystackIntegration({ isLoading: true });

      render(<PaystackCheckout {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("disabled");
    });
  });

describe("Console Logging (Development)", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("logs component props on mount and updates", () => {
    const { rerender } = render(<PaystackCheckout {...defaultProps} />);

    // Get all mount-related calls
    const mountCalls = consoleSpy.mock.calls.filter(
      (call) => call[0] === "🟠 PaystackCheckout: Component mounted/updated"
    );

    const propCalls = consoleSpy.mock.calls.filter(
      (call) => call[0] === "🟠 PaystackCheckout: Received props:"
    );

    // Should have at least one mount call and one props call
    expect(mountCalls.length).toBeGreaterThan(0);
    expect(propCalls.length).toBeGreaterThan(0);

    // Clear for the rerender test
    consoleSpy.mockClear();

    // Test prop change
    const newProps = {
      ...defaultProps,
      totalAmount: 6000,
    };
    rerender(<PaystackCheckout {...newProps} />);

    // Check that new logs occurred after rerender
    const newMountCalls = consoleSpy.mock.calls.filter(
      (call) => call[0] === "🟠 PaystackCheckout: Component mounted/updated"
    );
    const newPropCalls = consoleSpy.mock.calls.filter(
      (call) => call[0] === "🟠 PaystackCheckout: Received props:"
    );

    expect(newMountCalls.length).toBeGreaterThan(0);
    expect(newPropCalls.length).toBeGreaterThan(0);

    // Verify the new props were logged
    const hasNewProps = newPropCalls.some(
      (call) => call[1] && call[1].totalAmount === 6000
    );
    expect(hasNewProps).toBe(true);
  });
});
});
