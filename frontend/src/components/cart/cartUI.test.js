// frontend/src/components/cart/cartUI.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => {
    const { onError, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} onError={onError} />;
  },
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      ...props
    }) => <div {...props}>{children}</div>,
    button: ({ children, whileHover, whileTap, ...props }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Trash2: () => <svg data-testid="trash-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Minus: () => <svg data-testid="minus-icon" />,
}));

// Import the component after mocks
import CartUI from "../cart/cartUI";

describe("CartUI Component", () => {
  const mockFormatCurrency = jest.fn((amount) => `₦${amount.toLocaleString()}`);
  const mockHandleQuantityChange = jest.fn();
  const mockHandleCheckout = jest.fn();
  const mockRemoveItem = jest.fn();
  const mockClearCart = jest.fn();

  const mockItems = [
    {
      cartId: "cart-1",
      eventTitle: "Tech Conference 2024",
      eventImage: "/img/tech-conf.jpg",
      tierName: "VIP",
      price: 50000,
      quantity: 2,
      maxQuantity: 10,
    },
    {
      cartId: "cart-2",
      eventTitle: "Music Festival",
      eventImage: "/img/music-fest.jpg",
      tierName: "General Admission",
      price: 25000,
      quantity: 1,
      maxQuantity: 5,
    },
  ];

  const defaultProps = {
    items: mockItems,
    itemCount: 3,
    subtotal: 125000,
    vatAmount: 9375,
    serviceFee: 5000,
    total: 139375,
    isProcessing: false,
    handleQuantityChange: mockHandleQuantityChange,
    handleCheckout: mockHandleCheckout,
    removeItem: mockRemoveItem,
    clearCart: mockClearCart,
    formatCurrency: mockFormatCurrency,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders cart title", () => {
      render(<CartUI {...defaultProps} />);
      expect(screen.getByText("Your Ticket Cart")).toBeInTheDocument();
    });

    test("renders all cart items", () => {
      render(<CartUI {...defaultProps} />);
      expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
      expect(screen.getByText("Music Festival")).toBeInTheDocument();
    });

    test("renders item details correctly", () => {
      render(<CartUI {...defaultProps} />);
      expect(screen.getByText(/VIP/)).toBeInTheDocument();
      expect(screen.getByText(/General Admission/)).toBeInTheDocument();
    });

    test("renders order summary section", () => {
      render(<CartUI {...defaultProps} />);
      expect(screen.getByText("Order Summary")).toBeInTheDocument();
    });

    test("displays correct subtotal, fees, and total", () => {
      render(<CartUI {...defaultProps} />);
      expect(
        screen.getByText(/Tickets Subtotal \(3 items\)/)
      ).toBeInTheDocument();
      expect(screen.getByText("Service Fee")).toBeInTheDocument();
      expect(screen.getByText("Value Added Tax (VAT)")).toBeInTheDocument();
      expect(screen.getByText("Total Due")).toBeInTheDocument();
    });

    test("renders checkout button", () => {
      render(<CartUI {...defaultProps} />);
      expect(screen.getByText("Proceed to Checkout")).toBeInTheDocument();
    });

    test("renders clear cart button", () => {
      render(<CartUI {...defaultProps} />);
      expect(screen.getByText("Clear Cart")).toBeInTheDocument();
    });

    test("renders item images with correct src", () => {
      render(<CartUI {...defaultProps} />);
      const images = screen.getAllByRole("img");
      expect(images[0]).toHaveAttribute("src", "/img/tech-conf.jpg");
      expect(images[1]).toHaveAttribute("src", "/img/music-fest.jpg");
    });
  });

  describe("Quantity Controls", () => {
    test("displays correct quantity for each item", () => {
      render(<CartUI {...defaultProps} />);
      const quantities = screen.getAllByText(/^[0-9]+$/);
      expect(quantities[0]).toHaveTextContent("2");
      expect(quantities[1]).toHaveTextContent("1");
    });

    test("calls handleQuantityChange when increase button is clicked", () => {
      render(<CartUI {...defaultProps} />);
      const plusIcons = screen.getAllByTestId("plus-icon");

      // Click the first plus button
      fireEvent.click(plusIcons[0].parentElement);
      expect(mockHandleQuantityChange).toHaveBeenCalledWith("cart-1", 3);
    });

    test("calls handleQuantityChange when decrease button is clicked", () => {
      render(<CartUI {...defaultProps} />);
      const minusIcons = screen.getAllByTestId("minus-icon");

      // Click the first minus button
      fireEvent.click(minusIcons[0].parentElement);
      expect(mockHandleQuantityChange).toHaveBeenCalledWith("cart-1", 1);
    });

    test("disables decrease button when quantity is 1", () => {
      render(<CartUI {...defaultProps} />);
      const minusIcons = screen.getAllByTestId("minus-icon");

      // Second item has quantity 1, so its decrease button should be disabled
      const secondMinusButton = minusIcons[1].parentElement;
      expect(secondMinusButton).toBeDisabled();
    });

    test("disables increase button when quantity reaches maxQuantity", () => {
      const propsWithMaxQuantity = {
        ...defaultProps,
        items: [
          {
            ...mockItems[0],
            quantity: 10,
            maxQuantity: 10,
          },
        ],
      };

      render(<CartUI {...propsWithMaxQuantity} />);
      const plusIcon = screen.getByTestId("plus-icon");
      const plusButton = plusIcon.parentElement;
      expect(plusButton).toBeDisabled();
    });
  });

  describe("Item Removal", () => {
    test("calls removeItem when trash icon is clicked", () => {
      render(<CartUI {...defaultProps} />);
      const removeButtons = screen.getAllByLabelText("Remove item");

      fireEvent.click(removeButtons[0]);
      expect(mockRemoveItem).toHaveBeenCalledWith("cart-1");
    });

    test("calls clearCart when clear cart button is clicked", () => {
      render(<CartUI {...defaultProps} />);
      const clearButton = screen.getByText("Clear Cart");

      fireEvent.click(clearButton);
      expect(mockClearCart).toHaveBeenCalled();
    });
  });

  describe("Checkout", () => {
    test("calls handleCheckout when checkout button is clicked", () => {
      render(<CartUI {...defaultProps} />);
      const checkoutButton = screen.getByText("Proceed to Checkout");

      fireEvent.click(checkoutButton);
      expect(mockHandleCheckout).toHaveBeenCalled();
    });

    test("disables checkout button when isProcessing is true", () => {
      const processingProps = { ...defaultProps, isProcessing: true };
      render(<CartUI {...processingProps} />);

      const checkoutButton = screen.getByText("Processing...");
      expect(checkoutButton).toBeDisabled();
    });

    test("disables checkout button when cart is empty", () => {
      const emptyCartProps = { ...defaultProps, items: [], itemCount: 0 };
      render(<CartUI {...emptyCartProps} />);

      const checkoutButton = screen.getByText("Proceed to Checkout");
      expect(checkoutButton).toBeDisabled();
    });

    test("displays processing text when isProcessing is true", () => {
      const processingProps = { ...defaultProps, isProcessing: true };
      render(<CartUI {...processingProps} />);

      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });
  });

  describe("Currency Formatting", () => {
    test("calls formatCurrency for subtotal", () => {
      render(<CartUI {...defaultProps} />);
      expect(mockFormatCurrency).toHaveBeenCalledWith(125000);
    });

    test("calls formatCurrency for service fee", () => {
      render(<CartUI {...defaultProps} />);
      expect(mockFormatCurrency).toHaveBeenCalledWith(5000);
    });

    test("calls formatCurrency for VAT amount", () => {
      render(<CartUI {...defaultProps} />);
      expect(mockFormatCurrency).toHaveBeenCalledWith(9375);
    });

    test("calls formatCurrency for total", () => {
      render(<CartUI {...defaultProps} />);
      expect(mockFormatCurrency).toHaveBeenCalledWith(139375);
    });

    test("calls formatCurrency for item totals", () => {
      render(<CartUI {...defaultProps} />);
      // First item: 50000 * 2 = 100000
      expect(mockFormatCurrency).toHaveBeenCalledWith(100000);
      // Second item: 25000 * 1 = 25000
      expect(mockFormatCurrency).toHaveBeenCalledWith(25000);
    });
  });

  describe("Image Handling", () => {
    test("renders placeholder image when src is missing", () => {
      const itemsWithoutImage = [{ ...mockItems[0], eventImage: null }];
      const props = { ...defaultProps, items: itemsWithoutImage };

      render(<CartUI {...props} />);
      const image = screen.getAllByRole("img")[0];
      expect(image).toHaveAttribute("src", "/img/placeholder.jpg");
    });

    test("uses correct alt text for images", () => {
      render(<CartUI {...defaultProps} />);
      expect(screen.getByAltText("Tech Conference 2024")).toBeInTheDocument();
      expect(screen.getByAltText("Music Festival")).toBeInTheDocument();
    });

    test("handles image error by showing placeholder", () => {
      render(<CartUI {...defaultProps} />);
      const images = screen.getAllByRole("img");

      // Simulate image error
      fireEvent.error(images[0]);

      // After error, should show placeholder
      expect(images[0]).toHaveAttribute("src", "/img/placeholder.jpg");
    });
  });

  describe("Edge Cases", () => {
    test("renders empty items list when no items", () => {
      const emptyProps = { ...defaultProps, items: [], itemCount: 0 };
      render(<CartUI {...emptyProps} />);

      expect(
        screen.queryByText("Tech Conference 2024")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Music Festival")).not.toBeInTheDocument();
    });

    test("handles single item in cart", () => {
      const singleItemProps = {
        ...defaultProps,
        items: [mockItems[0]],
        itemCount: 2,
      };

      render(<CartUI {...singleItemProps} />);
      expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
      expect(screen.queryByText("Music Festival")).not.toBeInTheDocument();
    });

    test("handles items with zero maxQuantity", () => {
      const limitedProps = {
        ...defaultProps,
        items: [{ ...mockItems[0], quantity: 0, maxQuantity: 0 }],
      };

      render(<CartUI {...limitedProps} />);
      // Both buttons should be disabled
      const minusIcon = screen.getByTestId("minus-icon");
      const plusIcon = screen.getByTestId("plus-icon");

      expect(minusIcon.parentElement).toBeDisabled();
      expect(plusIcon.parentElement).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    test("remove buttons have proper aria-label", () => {
      render(<CartUI {...defaultProps} />);
      const removeButtons = screen.getAllByLabelText("Remove item");
      expect(removeButtons).toHaveLength(2);
    });

    test("checkout button is keyboard accessible", () => {
      render(<CartUI {...defaultProps} />);
      const checkoutButton = screen.getByText("Proceed to Checkout");

      checkoutButton.focus();
      expect(checkoutButton).toHaveFocus();
    });

    test("quantity buttons are keyboard accessible", () => {
      render(<CartUI {...defaultProps} />);
      const minusIcons = screen.getAllByTestId("minus-icon");
      const plusIcons = screen.getAllByTestId("plus-icon");

      // Check that buttons can receive focus
      const firstMinusButton = minusIcons[0].parentElement;
      const firstPlusButton = plusIcons[0].parentElement;

      firstMinusButton.focus();
      expect(firstMinusButton).toHaveFocus();

      firstPlusButton.focus();
      expect(firstPlusButton).toHaveFocus();
    });
  });
});
