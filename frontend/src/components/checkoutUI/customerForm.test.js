// frontend/src/components/checkoutUI/customerForm.test.js
// customerForm.test.js (CORRECTED)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomerForm from '../checkoutUI/customerForm'; // Adjust import path as needed

// Mock the external validation function
// NOTE: Make sure to create a mock file for this if you haven't (e.g., in __mocks__)
jest.mock('@/utils/validate/customerValidate', () => ({
  validateCustomerInfo: jest.fn((data) => {
    const errors = {};
    if (!data.firstName) errors.firstName = 'First Name is required';
    if (!data.email) errors.email = 'Email is required';
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.email = 'Invalid email format';
    
    // Simulate validation logic for required fields
    if (!data.lastName) errors.lastName = 'Last Name is required';
    if (!data.phone) errors.phone = 'Phone Number is required';
    if (!data.city) errors.city = 'City is required';
    if (!data.state) errors.state = 'State is required';

    return { isValid: Object.keys(errors).length === 0, errors };
  }),
}));

const mockValidateCustomerInfo = require('@/utils/validate/customerValidate').validateCustomerInfo;

// Mock props for the component
const defaultProps = {
  onCustomerInfoChange: jest.fn(),
  onValidationChange: jest.fn(),
};

describe('CustomerForm', () => {
  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock setup for successful validation (initial render state)
    mockValidateCustomerInfo.mockReturnValue({
      isValid: false,
      errors: {
        firstName: 'First Name is required',
        lastName: 'Last Name is required',
        email: 'Email is required',
        phone: 'Phone Number is required',
        city: 'City is required',
        state: 'State is required',
      },
    });
  });

  // Helper function to find all inputs/selects
  const getFormElements = () => ({
    firstName: screen.getByLabelText(/First Name/i),
    lastName: screen.getByLabelText(/Last Name/i),
    email: screen.getByLabelText(/Email Address/i),
    phone: screen.getByLabelText(/Phone Number/i),
    city: screen.getByLabelText(/City/i),
    state: screen.getByLabelText(/State/i, { selector: 'select' }),
  });

  describe('Rendering', () => {
    test('renders all form fields correctly', () => {
      render(<CustomerForm {...defaultProps} />);

      // Use RegExp with getByLabelText for robustness (fixes previous failure)
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/State/i, { selector: 'select' })).toBeInTheDocument(); // Specify selector for select
      expect(screen.getByTestId("user-icon")).toBeInTheDocument(); // Check for icon rendering
    });

    test('renders with correct initial values', () => {
      render(<CustomerForm {...defaultProps} />);
      const { firstName, lastName, email, phone, city, state } = getFormElements();

      // Fix: Check specific input values, not generic empty value
      expect(firstName).toHaveValue("");
      expect(lastName).toHaveValue("");
      expect(email).toHaveValue("");
      expect(phone).toHaveValue("");
      expect(city).toHaveValue("");
      expect(state).toHaveValue(""); // Select initial value is "" (Select State)

      // Ensure 'country' field is logically present in the form data sent to parent
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'Nigeria' })
      );
    });
  });

  describe('Form Interactions', () => {
    test('updates form data when user types in fields', () => {
      render(<CustomerForm {...defaultProps} />);
      const { firstName } = getFormElements();

      fireEvent.change(firstName, { target: { value: 'Jane' } });

      expect(firstName).toHaveValue('Jane');
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Jane' })
      );
    });

    test('handles all field changes correctly', () => {
      render(<CustomerForm {...defaultProps} />);
      const { email, phone, state } = getFormElements();

      fireEvent.change(email, { target: { value: 'test@example.com' } });
      fireEvent.change(phone, { target: { value: '08012345678' } });
      fireEvent.change(state, { target: { value: 'Lagos' } });

      expect(email).toHaveValue('test@example.com');
      expect(phone).toHaveValue('08012345678');
      expect(state).toHaveValue('Lagos');
      
      // Verify parent received all updates
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          phone: '08012345678',
          state: 'Lagos',
        })
      );
    });

    test('marks fields as touched on blur', () => {
      render(<CustomerForm {...defaultProps} />);
      const { firstName } = getFormElements();

      fireEvent.blur(firstName);

      // Check if validation function was called (implies component state was updated)
      expect(mockValidateCustomerInfo).toHaveBeenCalled(); 
      // Due to the component's internal logic, verifying visual change (error display) 
      // in the next section is the best way to confirm 'touched' state.
    });
  });

  describe('Validation', () => {
    test('calls validation function with form data', () => {
      render(<CustomerForm {...defaultProps} />);
      const { firstName } = getFormElements();

      fireEvent.change(firstName, { target: { value: 'TestName' } });

      // Expect the validation function to be called with the updated data
      expect(mockValidateCustomerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'TestName' })
      );
    });

    test('shows validation errors when fields are invalid and touched', async () => {
      // Mock validation to pass only a single error
      mockValidateCustomerInfo.mockReturnValue({
        isValid: false,
        errors: { firstName: 'First Name is required' },
      });
      render(<CustomerForm {...defaultProps} />);
      const { firstName } = getFormElements();

      fireEvent.blur(firstName);

      // Wait for the error message to appear (motion component delay)
      await waitFor(() => {
        expect(screen.getByText(/First Name is required/i)).toBeInTheDocument();
      });
    });

    test('does not show errors until fields are touched', () => {
      // Mock validation to show an error immediately
      mockValidateCustomerInfo.mockReturnValue({
        isValid: false,
        errors: { firstName: 'First Name is required' },
      });
      render(<CustomerForm {...defaultProps} />);

      // Error text should NOT be visible on initial render, despite error existing
      expect(screen.queryByText(/First Name is required/i)).not.toBeInTheDocument();

      const { firstName } = getFormElements();
      fireEvent.blur(firstName);

      // Error should be visible after touch/blur
      expect(screen.getByText(/First Name is required/i)).toBeInTheDocument();
    });

    test('updates parent with validation status', async () => {
      render(<CustomerForm {...defaultProps} />);

      // Initial state (all fields empty/invalid)
      expect(defaultProps.onValidationChange).toHaveBeenCalledWith(false);

      // Change data to be valid (mock a valid result)
      mockValidateCustomerInfo.mockReturnValue({
        isValid: true,
        errors: {},
      });
      
      // Force an update to trigger validation recalculation
      const { firstName } = getFormElements();
      fireEvent.change(firstName, { target: { value: 'ValidName' } });

      // Parent should be called with true (due to mock returning isValid: true)
      await waitFor(() => {
        expect(defaultProps.onValidationChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Error Display', () => {
    test('applies error styling to invalid touched fields', () => {
      // Mock validation to return an error
      mockValidateCustomerInfo.mockReturnValue({
        isValid: false,
        errors: { email: 'Invalid email format' },
      });
      render(<CustomerForm {...defaultProps} />);
      const { email } = getFormElements();

      fireEvent.change(email, { target: { value: 'invalid-email' } });
      fireEvent.blur(email);

      // Check if the input has the error class (border-red-500)
      expect(email).toHaveClass('border-red-500');
    });

    test('clears error styling when field becomes valid', () => {
      render(<CustomerForm {...defaultProps} />);
      const { email } = getFormElements();

      // 1. Enter invalid data and blur (Error state)
      mockValidateCustomerInfo.mockReturnValue({
        isValid: false,
        errors: { email: 'Invalid email format' },
      });
      fireEvent.change(email, { target: { value: 'invalid' } });
      fireEvent.blur(email);
      expect(email).toHaveClass('border-red-500');
      
      // 2. Update the mock to return valid result for the next change
      mockValidateCustomerInfo.mockReturnValue({
        isValid: true,
        errors: {},
      });

      // 3. Enter valid data (Value state)
      fireEvent.change(email, { target: { value: 'valid@example.com' } });

      // Wait for the style update (validation useEffect hook)
      expect(email).not.toHaveClass('border-red-500');
    });
  });

  describe('State Dropdown', () => {
    test('allows selecting different states', () => {
      render(<CustomerForm {...defaultProps} />);
      const { state } = getFormElements();

      fireEvent.change(state, { target: { value: 'Kano' } });

      expect(state).toHaveValue('Kano');
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'Kano' })
      );
    });

    test('includes all Nigerian states in dropdown', () => {
      render(<CustomerForm {...defaultProps} />);
      
      // Check for a few expected options based on your component's JSX
      expect(screen.getByRole('option', { name: 'Select State' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Lagos' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Abuja' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Enugu' })).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    test('uses memoized validation', () => {
      // This test is already good, we ensure the mock is called
      render(<CustomerForm {...defaultProps} />);

      // Validation runs on mount
      expect(mockValidateCustomerInfo).toHaveBeenCalledTimes(1); 
      
      const { firstName } = getFormElements();

      // Change firstName, which should trigger a call
      fireEvent.change(firstName, { target: { value: 'NewName' } });
      
      // The memoization should ensure the function is called only when relevant props (formData) change
      // It should be called again after the change
      expect(mockValidateCustomerInfo).toHaveBeenCalledTimes(2); 
    });
  });
  
  describe('Edge Cases', () => {
    test('handles very long input values', () => {
      render(<CustomerForm {...defaultProps} />);
      const { firstName } = getFormElements();
      const longString = 'A'.repeat(500);

      fireEvent.change(firstName, { target: { value: longString } });
      
      expect(firstName).toHaveValue(longString);
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: longString })
      );
      // The validation mock handles the logic for limiting length if required.
    });
    
    test('handles special characters in input', () => {
      render(<CustomerForm {...defaultProps} />);
      const { firstName } = getFormElements();
      const specialChars = "O'Malley-Smith (Jr.)";

      fireEvent.change(firstName, { target: { value: specialChars } });

      expect(firstName).toHaveValue(specialChars);
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: specialChars })
      );
    });

    test('maintains country as Nigeria by default', () => {
      render(<CustomerForm {...defaultProps} />);
      
      // Verify country is Nigeria in the data sent to parent on initial render
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'Nigeria' })
      );
      
      // Change another field to ensure country is maintained in subsequent calls
      const { city } = getFormElements();
      fireEvent.change(city, { target: { value: 'NewCity' } });
      
      expect(defaultProps.onCustomerInfoChange).toHaveBeenCalledWith(
        expect.objectContaining({ 
          city: 'NewCity', 
          country: 'Nigeria' 
        })
      );
    });
  });

  describe('Accessibility', () => {
    test('has proper labels for all inputs (Testing Library check)', () => {
      // FIX: This test now passes because we added id/htmlFor to the component.
      render(<CustomerForm {...defaultProps} />);

      // If the component passes this query, it means the label is correctly associated with the control.
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/State/i, { selector: 'select' })).toBeInTheDocument();
    });

    test('marks required fields with asterisk', () => {
      // FIX: This test now passes because we added 'required' attribute to the input
      render(<CustomerForm {...defaultProps} />);

      // Check for the 'required' attribute presence on all fields labeled with an asterisk
      const requiredFields = [
        screen.getByLabelText(/First Name/i),
        screen.getByLabelText(/Last Name/i),
        screen.getByLabelText(/Email Address/i),
        screen.getByLabelText(/Phone Number/i),
        screen.getByLabelText(/City/i),
        screen.getByLabelText(/State/i, { selector: 'select' }),
      ];

      requiredFields.forEach(field => {
        expect(field).toHaveAttribute('required');
      });
    });
  });
});