// frontend/src/redux/action/vendorAction.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axiosConfig/axios";
// 1. The import of the default export is correct:
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
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `${API_ENDPOINTS.VENDORS.LIST}?${queryParams}`;

    try {
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_VENDORS_FAILED;
      // 2. FIX: Access the .error method on the imported object
      toastAlert.error(message);
      return rejectWithValue({ message });
    }
  }
);

export const getVendorProfile = createAsyncThunk(
  REDUX_ACTION_TYPES.GET_VENDOR_PROFILE,
  async (vendorId, { rejectWithValue }) => {
    const endpoint = API_ENDPOINTS.VENDORS.GET_PROFILE.replace(":id", vendorId);

    try {
      const response = await axios.get(endpoint);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.FETCH_PROFILE_FAILED;
      // 3. FIX: Access the .error method on the imported object
      toastAlert.error(message);
      return rejectWithValue({ message });
    }
  }
);

export const registerVendor = createAsyncThunk(
  REDUX_ACTION_TYPES.REGISTER_VENDOR,
  // registrationData is the clean JSON object containing imageURL
  async (registrationData, { rejectWithValue }) => {
    // 1. LOG: Data being sent to the API
    console.log("[API REQUEST] Register Vendor Payload:", registrationData);

    try {
      const response = await axios.post(
        API_ENDPOINTS.VENDORS.REGISTER,
        registrationData // Axios sends this as JSON
      );

      // 2. LOG: Successful API response data
      console.log("[API RESPONSE] Register Vendor Success:", response.data);

      // Correct toast usage
      toastAlert.success(SUCCESS_MESSAGES.VENDOR_REGISTERED);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.REGISTER_VENDOR_FAILED;

      // 3. LOG: Failed API request details (status and message)
      console.error(
        "[API ERROR] Register Vendor Failed:",
        error.response?.status,
        error.response?.data
      );

      // Correct toast usage
      toastAlert.error(message);
      return rejectWithValue({ message });
    }
  }
);

export const updateVendor = createAsyncThunk(
  REDUX_ACTION_TYPES.UPDATE_VENDOR,
  // data is the clean JSON object containing imageURL
  async ({ vendorId, data }, { rejectWithValue }) => {
    // 1. Build the dynamic endpoint
    const endpoint = API_ENDPOINTS.VENDORS.UPDATE.replace(":id", vendorId);

    try {
      // 2. Perform the PATCH request with the JSON data
      const response = await axios.patch(endpoint, data); // Axios sends this as JSON

      // Correct toast usage
      toastAlert.success(SUCCESS_MESSAGES.VENDOR_UPDATED);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || ERROR_MESSAGES.UPDATE_VENDOR_FAILED;
      // Correct toast usage
      toastAlert.error(message);
      return rejectWithValue({ message });
    }
  }
);
