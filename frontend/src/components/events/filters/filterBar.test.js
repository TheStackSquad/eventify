// src/components/events/filters/filterBar.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterBar from "./filterBar";

describe("FilterBar", () => {
  const defaultProps = {
    location: "All Locations",
    onLocationChange: jest.fn(),
    locations: ["All Locations", "New York", "Los Angeles", "Chicago"],
    sortBy: "date-asc",
    onSortChange: jest.fn(),
    resultsCount: 10,
    isSticky: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the component with all elements", () => {
      render(<FilterBar {...defaultProps} />);

      expect(screen.getByText("10 Events")).toBeInTheDocument();
      expect(screen.getByDisplayValue("All Locations")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Date: Soonest First")
      ).toBeInTheDocument();
    });

    it('displays singular "Event" when resultsCount is 1', () => {
      render(<FilterBar {...defaultProps} resultsCount={1} />);

      expect(screen.getByText("1 Event")).toBeInTheDocument();
    });

    it('displays plural "Events" when resultsCount is not 1', () => {
      render(<FilterBar {...defaultProps} resultsCount={0} />);
      expect(screen.getByText("0 Events")).toBeInTheDocument();

      render(<FilterBar {...defaultProps} resultsCount={5} />);
      expect(screen.getByText("5 Events")).toBeInTheDocument();
    });

    it("renders all location options", () => {
      render(<FilterBar {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");
      const options = locationSelect.querySelectorAll("option");

      expect(options).toHaveLength(4);
      expect(options[0]).toHaveTextContent("All Locations");
      expect(options[1]).toHaveTextContent("New York");
      expect(options[2]).toHaveTextContent("Los Angeles");
      expect(options[3]).toHaveTextContent("Chicago");
    });

    it("renders all sort options", () => {
      render(<FilterBar {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue("Date: Soonest First");
      const options = sortSelect.querySelectorAll("option");

      expect(options).toHaveLength(5);
      expect(options[0]).toHaveTextContent("Date: Soonest First");
      expect(options[1]).toHaveTextContent("Date: Latest First");
      expect(options[2]).toHaveTextContent("Price: Low to High");
      expect(options[3]).toHaveTextContent("Price: High to Low");
      expect(options[4]).toHaveTextContent("Location: A-Z");
    });
  });

  describe("Sticky Behavior", () => {
    it("applies sticky classes when isSticky is true", () => {
      const { container } = render(
        <FilterBar {...defaultProps} isSticky={true} />
      );

      const filterBarDiv = container.firstChild;
      expect(filterBarDiv).toHaveClass("sticky", "top-0", "z-40", "shadow-md");
    });

    it("does not apply sticky classes when isSticky is false", () => {
      const { container } = render(
        <FilterBar {...defaultProps} isSticky={false} />
      );

      const filterBarDiv = container.firstChild;
      expect(filterBarDiv).not.toHaveClass(
        "sticky",
        "top-0",
        "z-40",
        "shadow-md"
      );
    });
  });

  describe("Location Filter", () => {
    it("calls onLocationChange when location is changed", () => {
      render(<FilterBar {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");
      fireEvent.change(locationSelect, { target: { value: "New York" } });

      expect(defaultProps.onLocationChange).toHaveBeenCalledTimes(1);
      expect(defaultProps.onLocationChange).toHaveBeenCalledWith("New York");
    });

    it("displays the selected location", () => {
      render(<FilterBar {...defaultProps} location="Chicago" />);

      expect(screen.getByDisplayValue("Chicago")).toBeInTheDocument();
    });
  });

  describe("Sort Filter", () => {
    it("calls onSortChange when sort option is changed", () => {
      render(<FilterBar {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue("Date: Soonest First");
      fireEvent.change(sortSelect, { target: { value: "price-asc" } });

      expect(defaultProps.onSortChange).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSortChange).toHaveBeenCalledWith("price-asc");
    });

    it("displays the selected sort option", () => {
      render(<FilterBar {...defaultProps} sortBy="price-desc" />);

      expect(
        screen.getByDisplayValue("Price: High to Low")
      ).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("renders MapPin icon for location filter", () => {
      const { container } = render(<FilterBar {...defaultProps} />);

      // Check for MapPin icon (lucide-react renders as svg)
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });

    it("renders ArrowUpDown icon for sort filter", () => {
      const { container } = render(<FilterBar {...defaultProps} />);

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty locations array", () => {
      const { container } = render(
        <FilterBar {...defaultProps} locations={[]} />
      );

      // Find the location select by looking for selects in the container
      const selects = container.querySelectorAll("select");
      const locationSelect = selects[0]; // First select is location
      const options = locationSelect.querySelectorAll("option");

      expect(options).toHaveLength(0);
    });

    it("handles zero results count", () => {
      render(<FilterBar {...defaultProps} resultsCount={0} />);

      expect(screen.getByText("0 Events")).toBeInTheDocument();
    });

    it("handles large results count", () => {
      render(<FilterBar {...defaultProps} resultsCount={9999} />);

      expect(screen.getByText("9999 Events")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has properly labeled select elements", () => {
      render(<FilterBar {...defaultProps} />);

      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(2);
    });

    it("select elements are keyboard accessible", () => {
      render(<FilterBar {...defaultProps} />);

      const locationSelect = screen.getByDisplayValue("All Locations");

      locationSelect.focus();
      expect(document.activeElement).toBe(locationSelect);
    });
  });
});
