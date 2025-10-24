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
    // Add rating state if you want to handle ratings here too
    rating: {
      status: STATUS.IDLE,
      data: null,
      error: null,
    },
  },
  reducers: {
    // You can also define the reset action here as a reducer
    resetCreateInquiryStatus: (state) => {
      state.createInquiry.status = STATUS.IDLE;
      state.createInquiry.data = null;
      state.createInquiry.error = null;
    },
    resetRatingStatus: (state) => {
      state.rating.status = STATUS.IDLE;
      state.rating.data = null;
      state.rating.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Inquiry cases
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

// Export the actions from the slice
export const { resetCreateInquiryStatus, resetRatingStatus } =
  inquirySlice.actions;

export default inquirySlice.reducer;
