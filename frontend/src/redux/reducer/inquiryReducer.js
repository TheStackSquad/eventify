//frontend/src/redux/reducer/inquiryReducer.js

import { createSlice } from "@reduxjs/toolkit";
import { createInquiry } from "@/redux/action/inquiryAction";
import { STATUS } from "@/utils/constants/globalConstants";

const inquirySlice = createSlice({
  name: "inquiry",
  initialState: {
    createInquiry: {
      status: STATUS.IDLE,
      data: null,
      error: null,
    },
    vendorInquiries: {
      status: STATUS.IDLE,
      data: [],
      error: null,
    },
    updateInquiry: {
      status: STATUS.IDLE,
      data: null,
      error: null,
    },
    deleteInquiry: {
      status: STATUS.IDLE,
      data: null,
      error: null,
    },
  },
  reducers: {
    resetCreateInquiryStatus: (state) => {
      state.createInquiry.status = STATUS.IDLE;
      state.createInquiry.data = null;
      state.createInquiry.error = null;
    },
    resetVendorInquiriesStatus: (state) => {
      state.vendorInquiries.status = STATUS.IDLE;
      state.vendorInquiries.data = [];
      state.vendorInquiries.error = null;
    },
    resetUpdateInquiryStatus: (state) => {
      state.updateInquiry.status = STATUS.IDLE;
      state.updateInquiry.data = null;
      state.updateInquiry.error = null;
    },
    resetDeleteInquiryStatus: (state) => {
      state.deleteInquiry.status = STATUS.IDLE;
      state.deleteInquiry.data = null;
      state.deleteInquiry.error = null;
    },
    // For pre-filling forms when updating
    setInquiryFormData: (state, action) => {
      state.formData = action.payload;
    },
    clearInquiryFormData: (state) => {
      state.formData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Inquiry
      .addCase(createInquiry.pending, (state) => {
        state.createInquiry.status = STATUS.LOADING;
        state.createInquiry.error = null;
      })
      .addCase(createInquiry.fulfilled, (state, action) => {
        state.createInquiry.status = STATUS.SUCCESS;
        state.createInquiry.data = action.payload;
        state.createInquiry.error = null;
      })
      .addCase(createInquiry.rejected, (state, action) => {
        state.createInquiry.status = STATUS.ERROR;
        state.createInquiry.error = action.payload;
        state.createInquiry.data = null;
      });
  },
});

export const {
  resetCreateInquiryStatus,
  resetVendorInquiriesStatus,
  resetUpdateInquiryStatus,
  resetDeleteInquiryStatus,
  setInquiryFormData,
  clearInquiryFormData,
} = inquirySlice.actions;

export default inquirySlice.reducer;