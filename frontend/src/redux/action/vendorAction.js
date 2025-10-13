//frontend/src/redux/action/vendorAction.js
 
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
import toastAlert from "@/components/common/toast/toastAlert";
import {
  REDUX_ACTION_TYPES,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/utils/constants/globalConstants";

export const fetchVendors = createAsyncThunk(
  REDUX_ACTION_TYPES.FETCH_VENDORS,
  async (filters, { rejectWithValue }) => {
    // Convert filters object into URL query parameters
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `${API_ENDPOINTS.VENDORS.LIST}?${queryParams}`;

    try {
      const response = await axios.get(endpoint);
      // No toast needed for a successful data fetch
      return response.data; // Expects an array of vendor objects
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_VENDORS_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const getVendorProfile = createAsyncThunk(
  REDUX_ACTION_TYPES.GET_VENDOR_PROFILE,
  async (vendorId, { rejectWithValue }) => {
    // Replace the dynamic segment in the endpoint string
    const endpoint = API_ENDPOINTS.VENDORS.GET_PROFILE.replace(":id", vendorId);

    try {
      const response = await axios.get(endpoint);
      // No toast needed for successful data fetch
      return response.data; // Expects a single vendor object
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_PROFILE_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);

export const registerVendor = createAsyncThunk(
  REDUX_ACTION_TYPES.REGISTER_VENDOR,
  async (registrationData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        API_ENDPOINTS.VENDORS.REGISTER,
        registrationData
      );
      toastAlert("success", SUCCESS_MESSAGES.VENDOR_REGISTERED);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.REGISTER_VENDOR_FAILED;
      toastAlert("error", message);
      return rejectWithValue({ message });
    }
  }
);