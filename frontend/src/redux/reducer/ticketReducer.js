// frontend/src/redux/reducer/ticketReducer.js

import { createSlice } from "@reduxjs/toolkit";
import { STATUS } from "@/utils/constants/globalConstants";

const initialState = {
  // User's purchased tickets
  purchasedTickets: [],

  // Status tracking
  status: STATUS.IDLE,
  error: null,
};

const ticketSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    clearTicketError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Add ticket purchase actions here later
  },
});

export const { clearTicketError } = ticketSlice.actions;
export default ticketSlice.reducer;
