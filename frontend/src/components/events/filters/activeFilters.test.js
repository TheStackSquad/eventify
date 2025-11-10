// src/components/events/filters/activeFilters.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ActiveFilters from "./activeFilters";

describe("ActiveFilters", () => {
  const defaultProps = {
    searchTerm: "",
    selectedCategory: "All",
    selectedLocation: "All Locations",
    sortBy: "date-asc",
    onClearSearch: jest.fn(),
    onClearCategory: jest.fn(),
    onClearLocation: jest.fn(),
    onClearSort: jest.fn(),
    onClearAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("returns null when no active filters", () => {
      const { container } = render(<ActiveFilters {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders "Active filters:" label when filters are active', () => {
      render(<ActiveFilters {...defaultProps} searchTerm="concert" />);
      expect(screen.getByText("Active filters:")).toBeInTheDocument();
    });

    it('renders "Clear all" button when filters are active', () => {
      render(<ActiveFilters {...defaultProps} searchTerm="concert" />);
      expect(screen.getByText("Clear all")).toBeInTheDocument();
    });
  });

  describe("Search Term Filter", () => {
    it("displays search term badge when searchTerm is provided", () => {
      render(<ActiveFilters {...defaultProps} searchTerm="jazz concert" />);
      expect(screen.getByText('Search: "jazz concert"')).toBeInTheDocument();
    });

    it("does not display search badge when searchTerm is empty", () => {
      render(
        <ActiveFilters
          {...defaultProps}
          searchTerm=""
          selectedCategory="Music"
        />
      );
      expect(screen.queryByText(/Search:/)).not.toBeInTheDocument();
    });

    it("calls onClearSearch when search badge is clicked", () => {
      render(<ActiveFilters {...defaultProps} searchTerm="concert" />);
      const badge = screen.getByText('Search: "concert"').closest("button");
      fireEvent.click(badge);
      expect(defaultProps.onClearSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Category Filter", () => {
    it('displays category badge when selectedCategory is not "All"', () => {
      render(<ActiveFilters {...defaultProps} selectedCategory="Music" />);
      expect(screen.getByText("Category: Music")).toBeInTheDocument();
    });

    it('does not display category badge when selectedCategory is "All"', () => {
      render(
        <ActiveFilters
          {...defaultProps}
          selectedCategory="All"
          searchTerm="test"
        />
      );
      expect(screen.queryByText(/Category:/)).not.toBeInTheDocument();
    });

    it("calls onClearCategory when category badge is clicked", () => {
      render(<ActiveFilters {...defaultProps} selectedCategory="Sports" />);
      const badge = screen.getByText("Category: Sports").closest("button");
      fireEvent.click(badge);
      expect(defaultProps.onClearCategory).toHaveBeenCalledTimes(1);
    });
  });

  describe("Location Filter", () => {
    it('displays location badge when selectedLocation is not "All Locations"', () => {
      render(<ActiveFilters {...defaultProps} selectedLocation="New York" />);
      expect(screen.getByText("Location: New York")).toBeInTheDocument();
    });

    it('does not display location badge when selectedLocation is "All Locations"', () => {
      render(
        <ActiveFilters
          {...defaultProps}
          selectedLocation="All Locations"
          searchTerm="test"
        />
      );
      expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
    });

    it("calls onClearLocation when location badge is clicked", () => {
      render(<ActiveFilters {...defaultProps} selectedLocation="Chicago" />);
      const badge = screen.getByText("Location: Chicago").closest("button");
      fireEvent.click(badge);
      expect(defaultProps.onClearLocation).toHaveBeenCalledTimes(1);
    });
  });

  describe("Sort Filter", () => {
    it('does not display sort badge when sortBy is "date-asc" (default)', () => {
      render(
        <ActiveFilters {...defaultProps} sortBy="date-asc" searchTerm="test" />
      );
      expect(screen.queryByText(/Sort:/)).not.toBeInTheDocument();
    });

    it('displays "Latest First" badge when sortBy is "date-desc"', () => {
      render(<ActiveFilters {...defaultProps} sortBy="date-desc" />);
      expect(screen.getByText("Sort: Latest First")).toBeInTheDocument();
    });

    it('displays "Price: Low-High" badge when sortBy is "price-asc"', () => {
      render(<ActiveFilters {...defaultProps} sortBy="price-asc" />);
      expect(screen.getByText("Sort: Price: Low-High")).toBeInTheDocument();
    });

    it('displays "Price: High-Low" badge when sortBy is "price-desc"', () => {
      render(<ActiveFilters {...defaultProps} sortBy="price-desc" />);
      expect(screen.getByText("Sort: Price: High-Low")).toBeInTheDocument();
    });

    it('displays "Location A-Z" badge when sortBy is "location"', () => {
      render(<ActiveFilters {...defaultProps} sortBy="location" />);
      expect(screen.getByText("Sort: Location A-Z")).toBeInTheDocument();
    });

    it("calls onClearSort when sort badge is clicked", () => {
      render(<ActiveFilters {...defaultProps} sortBy="price-asc" />);
      const badge = screen.getByText("Sort: Price: Low-High").closest("button");
      fireEvent.click(badge);
      expect(defaultProps.onClearSort).toHaveBeenCalledTimes(1);
    });
  });

  describe("Multiple Filters", () => {
    it("displays all active filters simultaneously", () => {
      render(
        <ActiveFilters
          {...defaultProps}
          searchTerm="concert"
          selectedCategory="Music"
          selectedLocation="New York"
          sortBy="price-asc"
        />
      );

      expect(screen.getByText('Search: "concert"')).toBeInTheDocument();
      expect(screen.getByText("Category: Music")).toBeInTheDocument();
      expect(screen.getByText("Location: New York")).toBeInTheDocument();
      expect(screen.getByText("Sort: Price: Low-High")).toBeInTheDocument();
    });

    it("displays correct number of badge buttons", () => {
      const { container } = render(
        <ActiveFilters
          {...defaultProps}
          searchTerm="concert"
          selectedCategory="Music"
          selectedLocation="New York"
        />
      );

      const badges = container.querySelectorAll("button.inline-flex");
      expect(badges).toHaveLength(3);
    });
  });

  describe("Clear All Button", () => {
    it('calls onClearAll when "Clear all" button is clicked', () => {
      render(<ActiveFilters {...defaultProps} searchTerm="test" />);

      const clearAllButton = screen.getByText("Clear all");
      fireEvent.click(clearAllButton);

      expect(defaultProps.onClearAll).toHaveBeenCalledTimes(1);
    });

    it('does not render "Clear all" button when no filters are active', () => {
      const { container } = render(<ActiveFilters {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Icons", () => {
    it("renders X icon in each badge", () => {
      const { container } = render(
        <ActiveFilters
          {...defaultProps}
          searchTerm="test"
          selectedCategory="Music"
        />
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Styling", () => {
    it("applies correct CSS classes to badge buttons", () => {
      render(<ActiveFilters {...defaultProps} searchTerm="concert" />);

      const badge = screen.getByText('Search: "concert"').closest("button");
      expect(badge).toHaveClass(
        "inline-flex",
        "items-center",
        "gap-1.5",
        "px-3",
        "py-1.5",
        "bg-orange-100",
        "text-orange-800",
        "rounded-full"
      );
    });

    it('applies correct CSS classes to "Clear all" button', () => {
      render(<ActiveFilters {...defaultProps} searchTerm="test" />);

      const clearAllButton = screen.getByText("Clear all");
      expect(clearAllButton).toHaveClass(
        "text-sm",
        "font-medium",
        "text-orange-600",
        "hover:text-orange-700",
        "underline",
        "ml-2"
      );
    });
  });

  describe("Edge Cases", () => {
    it("displays badges for empty string category and location (not default values)", () => {
      render(
        <ActiveFilters
          {...defaultProps}
          searchTerm=""
          selectedCategory=""
          selectedLocation=""
        />
      );
      // Empty strings are not "All" or "All Locations", so badges appear
      expect(screen.getByText("Category:")).toBeInTheDocument();
      expect(screen.getByText("Location:")).toBeInTheDocument();
    });

    it("handles special characters in search term", () => {
      render(
        <ActiveFilters {...defaultProps} searchTerm='test "with" quotes' />
      );
      expect(
        screen.getByText('Search: "test "with" quotes"')
      ).toBeInTheDocument();
    });

    it("handles long filter values", () => {
      const longSearch = "a".repeat(100);
      render(<ActiveFilters {...defaultProps} searchTerm={longSearch} />);
      expect(screen.getByText(`Search: "${longSearch}"`)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("badge buttons are keyboard accessible", () => {
      render(<ActiveFilters {...defaultProps} searchTerm="concert" />);

      const badge = screen.getByText('Search: "concert"').closest("button");
      badge.focus();
      expect(document.activeElement).toBe(badge);
    });

    it('"Clear all" button is keyboard accessible', () => {
      render(<ActiveFilters {...defaultProps} searchTerm="test" />);

      const clearAllButton = screen.getByText("Clear all");
      clearAllButton.focus();
      expect(document.activeElement).toBe(clearAllButton);
    });
  });
});
