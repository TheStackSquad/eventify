//frontend/src/redux/action/inquiryAction.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import { API_ENDPOINTS, REDUX_ACTION_TYPES, STATUS } from "@/utils/constants/globalConstants";
import axios from "@/axiosConfig/axios";

export const createInquiry = createAsyncThunk(
  REDUX_ACTION_TYPES.CREATE_INQUIRY,
  async ({ vendorId, name, email, message }, { rejectWithValue }) => {
    try {
      // Construct the API URL by replacing the placeholder
      const apiUrl = API_ENDPOINTS.INQUIRIES.CREATE.replace(
        ":vendor_id",
        vendorId
      );

      const response = await axios.post(apiUrl, {
        name,
        email,
        message,
      });

      // Backend should return the created inquiry object
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to submit inquiry.";
      return rejectWithValue(message);
    }
  }
);

// Add this reset action
export const resetCreateInquiryStatus = () => ({
  type: REDUX_ACTION_TYPES.RESET_CREATE_INQUIRY_STATUS,
});

// Other inquiry actions (GetVendorInquiries, UpdateInquiryStatus) would follow here.
