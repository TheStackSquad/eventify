//frontend/src/redux/action/inquiryAction.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  API_ENDPOINTS,
  REDUX_ACTION_TYPES,
  STATUS,
} from "@/utils/constants/globalConstants";
import axios from "@/axiosConfig/axios";

export const createInquiry = createAsyncThunk(
  REDUX_ACTION_TYPES.CREATE_INQUIRY,
  async ({ vendorId, name, email, message }, { rejectWithValue }) => {
    try {
      console.log("🔄 createInquiry action called with:", {
        vendorId,
        name,
        email,
        message,
      });

      const apiUrl = API_ENDPOINTS.INQUIRIES.CREATE.replace(
        ":vendor_id",
        vendorId
      );

      console.log("🌐 Final API URL:", apiUrl);
      console.log("📦 Request payload:", { name, email, message });

      // Add request interceptor for debugging
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const response = await axios.post(
        apiUrl,
        {
          name,
          email,
          message,
        },
        config
      );

      console.log("✅ Response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ createInquiry error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        fullError: error,
      });

      const message =
        error.response?.data?.message || "Failed to submit inquiry.";
      return rejectWithValue(message);
    }
  }
);

// Other inquiry actions (GetVendorInquiries, UpdateInquiryStatus) would follow here.
