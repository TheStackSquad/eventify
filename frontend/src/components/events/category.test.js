// frontend/src/components/events/category.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterControls from "./category";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...props }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  MapPin: () => <span data-testid="map-pin-icon">📍</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  Tag: () => <span data-testid="tag-icon">🏷️</span>,
  DollarSign: () => <span data-testid="dollar-sign-icon">💲</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">⬇️</span>,
}));

// Mock the categories data
jest.mock("@/data/upcomingEvents", () => ({
  allCategories: ["All", "Music", "Sports", "Tech", "Arts", "Food", "Business"],
}));

import { allCategories } from "@/data/upcomingEvents";

describe("FilterControls", () => {
  const defaultProps = {
    selectedCategory: "All",
    onCategoryChange: jest.fn(),
    locations: ["All Locations", "Lagos", "Abuja", "Port Harcourt", "Kano"],
    selectedLocation: "All Locations",
    onLocationChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all filter controls correctly", () => {
      render(<FilterControls {...defaultProps} />);

      // Check location dropdown
      expect(screen.getByTestId("map-pin-icon")).toBeInTheDocument();
      expect(screen.getByDisplayValue("All Locations")).toBeInTheDocument();

      // Check category tags
      allCategories.forEach((category) => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });

      // Check additional filter buttons
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Price Range")).toBeInTheDocument();
      expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
      expect(screen.getByTestId("dollar-sign-icon")).toBeInTheDocument();
    });

    it("renders location dropdown with all options", () => {
      render(<FilterControls {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");
      defaultProps.locations.forEach((location) => {
        expect(screen.getByText(location)).toBeInTheDocument();
      });
    });

    it("highlights the selected category", () => {
      render(<FilterControls {...defaultProps} />);

      const allCategoryButton = screen.getByText("All");
      expect(allCategoryButton).toHaveClass("bg-blue-600", "text-white");

      // Other categories should not be highlighted
      const musicCategoryButton = screen.getByText("Music");
      expect(musicCategoryButton).toHaveClass("bg-gray-100", "text-gray-700");
    });

    it("shows tag icon only for 'All' category", () => {
      render(<FilterControls {...defaultProps} />);

      // All category should have tag icon
      const allCategoryButton = screen.getByText("All");
      expect(allCategoryButton).toContainHTML('data-testid="tag-icon"');

      // Other categories should not have tag icon
      const musicCategoryButton = screen.getByText("Music");
      expect(musicCategoryButton).not.toContainHTML('data-testid="tag-icon"');
    });
  });

  describe("User Interactions", () => {
    it("calls onCategoryChange when a category button is clicked", () => {
      render(<FilterControls {...defaultProps} />);

      const musicCategoryButton = screen.getByText("Music");
      fireEvent.click(musicCategoryButton);

      expect(defaultProps.onCategoryChange).toHaveBeenCalledWith("Music");
      expect(defaultProps.onCategoryChange).toHaveBeenCalledTimes(1);
    });

    it("calls onLocationChange when location is selected", () => {
      render(<FilterControls {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");
      fireEvent.change(locationSelect, { target: { value: "Lagos" } });

      expect(defaultProps.onLocationChange).toHaveBeenCalledWith("Lagos");
      expect(defaultProps.onLocationChange).toHaveBeenCalledTimes(1);
    });

    it("handles multiple category changes correctly", () => {
      render(<FilterControls {...defaultProps} />);

      // Click multiple categories
      fireEvent.click(screen.getByText("Music"));
      fireEvent.click(screen.getByText("Sports"));
      fireEvent.click(screen.getByText("Tech"));

      expect(defaultProps.onCategoryChange).toHaveBeenCalledTimes(3);
      expect(defaultProps.onCategoryChange).toHaveBeenCalledWith("Music");
      expect(defaultProps.onCategoryChange).toHaveBeenCalledWith("Sports");
      expect(defaultProps.onCategoryChange).toHaveBeenCalledWith("Tech");
    });

    it("handles multiple location changes correctly", () => {
      render(<FilterControls {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");

      fireEvent.change(locationSelect, { target: { value: "Lagos" } });
      fireEvent.change(locationSelect, { target: { value: "Abuja" } });
      fireEvent.change(locationSelect, { target: { value: "Port Harcourt" } });

      expect(defaultProps.onLocationChange).toHaveBeenCalledTimes(3);
      expect(defaultProps.onLocationChange).toHaveBeenCalledWith("Lagos");
      expect(defaultProps.onLocationChange).toHaveBeenCalledWith("Abuja");
      expect(defaultProps.onLocationChange).toHaveBeenCalledWith(
        "Port Harcourt"
      );
    });
  });

  describe("Category Selection States", () => {
    it("applies correct styling to selected category", () => {
      const propsWithMusicSelected = {
        ...defaultProps,
        selectedCategory: "Music",
      };

      render(<FilterControls {...propsWithMusicSelected} />);

      const musicCategoryButton = screen.getByText("Music");
      expect(musicCategoryButton).toHaveClass("bg-blue-600", "text-white");

      // All category should not be selected
      const allCategoryButton = screen.getByText("All");
      expect(allCategoryButton).toHaveClass("bg-gray-100", "text-gray-700");
    });

    it("updates category styling when selection changes", () => {
      const { rerender } = render(<FilterControls {...defaultProps} />);

      // Initially "All" should be selected
      const allCategoryButton = screen.getByText("All");
      expect(allCategoryButton).toHaveClass("bg-blue-600");

      // Re-render with different selected category
      const updatedProps = {
        ...defaultProps,
        selectedCategory: "Sports",
      };
      rerender(<FilterControls {...updatedProps} />);

      // Now "Sports" should be selected
      const sportsCategoryButton = screen.getByText("Sports");
      expect(sportsCategoryButton).toHaveClass("bg-blue-600");

      // "All" should no longer be selected
      expect(allCategoryButton).not.toHaveClass("bg-blue-600");
    });
  });

  describe("Location Dropdown", () => {
    it("displays correct selected location", () => {
      const propsWithLagosSelected = {
        ...defaultProps,
        selectedLocation: "Lagos",
      };

      render(<FilterControls {...propsWithLagosSelected} />);

      expect(screen.getByDisplayValue("Lagos")).toBeInTheDocument();
    });

    it("renders all location options", () => {
      render(<FilterControls {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");
      defaultProps.locations.forEach((location) => {
        const option = screen.getByText(location);
        expect(option).toBeInTheDocument();
        expect(option).toHaveAttribute("value", location);
      });
    });
  });

  describe("Additional Filter Buttons", () => {
    it("renders date filter button", () => {
      render(<FilterControls {...defaultProps} />);

      const dateButton = screen.getByText("Date");
      expect(dateButton).toBeInTheDocument();
      expect(dateButton).toHaveClass("bg-gray-100");
      expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
    });

    it("renders price range filter button", () => {
      render(<FilterControls {...defaultProps} />);

      const priceButton = screen.getByText("Price Range");
      expect(priceButton).toBeInTheDocument();
      expect(priceButton).toHaveClass("bg-gray-100");
      expect(screen.getByTestId("dollar-sign-icon")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper labels and roles", () => {
      render(<FilterControls {...defaultProps} />);

      // Location dropdown should be a select element
      const locationSelect = screen.getByDisplayValue("All Locations");
      expect(locationSelect).toBeInTheDocument();

      // Category buttons should be button elements
      allCategories.forEach((category) => {
        const categoryButton = screen.getByText(category);
        expect(categoryButton.tagName).toBe("BUTTON");
      });

      // Additional filter buttons should be buttons
      expect(screen.getByText("Date").tagName).toBe("BUTTON");
      expect(screen.getByText("Price Range").tagName).toBe("BUTTON");
    });

    it("location dropdown has proper styling for interaction", () => {
      render(<FilterControls {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");
      expect(locationSelect).toHaveClass("cursor-pointer");
      expect(locationSelect).toHaveClass("appearance-none");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty locations array by showing default locations", () => {
      const propsWithEmptyLocations = {
        ...defaultProps,
        locations: [],
      };

      render(<FilterControls {...propsWithEmptyLocations} />);

      // Should show default "All Locations" option
      expect(screen.getByDisplayValue("All Locations")).toBeInTheDocument();
      expect(screen.getByText("All Locations")).toBeInTheDocument();
    });

    it("handles single location correctly", () => {
      const propsWithSingleLocation = {
        ...defaultProps,
        locations: ["Lagos"],
        selectedLocation: "Lagos",
      };

      render(<FilterControls {...propsWithSingleLocation} />);

      expect(screen.getByDisplayValue("Lagos")).toBeInTheDocument();
      expect(screen.getByText("Lagos")).toBeInTheDocument();
    });

    it("handles undefined callback functions gracefully without errors", () => {
      const propsWithoutCallbacks = {
        selectedCategory: "All",
        locations: ["Lagos"],
        selectedLocation: "Lagos",
        // onCategoryChange and onLocationChange are undefined
      };

      // Should not throw any errors during render or interaction
      expect(() => {
        render(<FilterControls {...propsWithoutCallbacks} />);
      }).not.toThrow();

      // Interactions should not throw errors (callbacks are safe now)
      const musicCategory = screen.getByText("Music");
      expect(() => {
        fireEvent.click(musicCategory);
      }).not.toThrow();

      const locationSelect = screen.getByDisplayValue("Lagos");
      expect(() => {
        fireEvent.change(locationSelect, { target: { value: "Abuja" } });
      }).not.toThrow();
    });

    it("handles null selected values by using defaults", () => {
      const propsWithNullValues = {
        selectedCategory: null,
        onCategoryChange: jest.fn(),
        locations: ["Lagos", "Abuja"],
        selectedLocation: null,
        onLocationChange: jest.fn(),
      };

      render(<FilterControls {...propsWithNullValues} />);

      // Should use default values instead of null
      expect(screen.getByText("All")).toBeInTheDocument();

      // Location should default to first available option
      const locationSelect = screen.getByRole("combobox");
      expect(locationSelect.value).toBe("Lagos"); // First location in array
    });

    it("handles empty string selected values by using defaults", () => {
      const propsWithEmptyValues = {
        selectedCategory: "",
        onCategoryChange: jest.fn(),
        locations: ["Lagos", "Abuja"],
        selectedLocation: "",
        onLocationChange: jest.fn(),
      };

      render(<FilterControls {...propsWithEmptyValues} />);

      // Should use default values instead of empty strings
      expect(screen.getByText("All")).toBeInTheDocument();

      // Location should default to first available option
      const locationSelect = screen.getByRole("combobox");
      expect(locationSelect.value).toBe("Lagos");
    });

    it("handles missing props by using default values", () => {
      // Render with no props at all
      render(<FilterControls />);

      // Should use all default values
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByDisplayValue("All Locations")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();

      // All categories should still render
      allCategories.forEach((category) => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });

    it("handles non-array locations by using default locations", () => {
      const propsWithInvalidLocations = {
        ...defaultProps,
        locations: "not-an-array", // Wrong type
      };

      render(<FilterControls {...propsWithInvalidLocations} />);

      // Should fall back to default locations
      expect(screen.getByDisplayValue("All Locations")).toBeInTheDocument();
    });
  });

describe("Default Behavior", () => {
  it("uses default values when no props are provided", () => {
    render(<FilterControls />);

    // Check default category selection
    const allCategoryButton = screen.getByText("All");
    expect(allCategoryButton).toHaveClass("bg-blue-600", "text-white");

    // Check default location
    expect(screen.getByDisplayValue("All Locations")).toBeInTheDocument();

    // All interactions should work without errors
    const musicCategory = screen.getByText("Music");
    expect(() => {
      fireEvent.click(musicCategory);
    }).not.toThrow();
  });

  it("calls provided callbacks when available", () => {
    const mockCategoryChange = jest.fn();
    const mockLocationChange = jest.fn();

    // Provide locations that include "Lagos" so we can test the change
    render(
      <FilterControls
        onCategoryChange={mockCategoryChange}
        onLocationChange={mockLocationChange}
        locations={["All Locations", "Lagos", "Abuja"]} // Add locations for testing
        selectedLocation="All Locations"
      />
    );

    // Category click should call the provided callback
    const musicCategory = screen.getByText("Music");
    fireEvent.click(musicCategory);
    expect(mockCategoryChange).toHaveBeenCalledWith("Music");

    // Location change should call the provided callback
    const locationSelect = screen.getByDisplayValue("All Locations");
    fireEvent.change(locationSelect, { target: { value: "Lagos" } });
    expect(mockLocationChange).toHaveBeenCalledWith("Lagos");
  });

  it("calls callbacks with partial props provided", () => {
    const mockCategoryChange = jest.fn();
    const mockLocationChange = jest.fn();

    // Test with only callbacks provided (no locations or selected values)
    render(
      <FilterControls
        onCategoryChange={mockCategoryChange}
        onLocationChange={mockLocationChange}
      />
    );

    // Category click should still work
    const sportsCategory = screen.getByText("Sports");
    fireEvent.click(sportsCategory);
    expect(mockCategoryChange).toHaveBeenCalledWith("Sports");

    // Location change should work with default locations
    const locationSelect = screen.getByDisplayValue("All Locations");
    fireEvent.change(locationSelect, { target: { value: "All Locations" } });
    expect(mockLocationChange).toHaveBeenCalledWith("All Locations");
  });
});

  describe("Responsive Design", () => {
    it("applies responsive classes correctly", () => {
      render(<FilterControls {...defaultProps} />);

      const container = screen.getByText("All").closest("div").parentElement;
      expect(container).toHaveClass("flex-col", "lg:flex-row");

      const categoryContainer = screen.getByText("All").closest("div");
      expect(categoryContainer).toHaveClass(
        "overflow-x-auto",
        "whitespace-nowrap"
      );
    });
  });
});
