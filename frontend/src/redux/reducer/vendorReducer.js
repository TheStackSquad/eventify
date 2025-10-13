//frontend/src/redux/reducer/vendorReducer.js

// frontend/src/redux/reducer/vendorReducer.js
import { createSlice } from "@reduxjs/toolkit";
import {
	fetchVendors,
	getVendorProfile,
	registerVendor,
	// Assuming admin actions will be imported/handled in a separate admin slice,
	// but we can add them here for simplicity if preferred.
} from "@/redux/action/vendorAction";
import { STATUS, VENDOR_DEFAULTS } from "@/utils/constants/globalConstants"; // Note: VENDOR_DEFAULTS is assumed

const initialState = VENDOR_DEFAULTS.INITIAL_STATE;

const vendorSlice = createSlice({
	name: "vendors",
	initialState,
	reducers: {
		// Clear errors
		clearVendorError(state) {
			state.error = null;
		},

		// Clear the list of vendors (e.g., when leaving the search page)
		clearVendorList(state) {
			state.vendors = [];
		},

		// Clear the selected vendor (e.g., when leaving the profile page)
		clearSelectedVendor(state) {
			state.selectedVendor = null;
		},

		// Update filter parameters (synchronous action)
		setVendorFilters(state, action) {
			state.filters = {
				...state.filters,
				...action.payload
			};
		},

		// Reset filters to initial state
		resetVendorFilters(state) {
			state.filters = initialState.filters;
		}
	},
	extraReducers: (builder) => {
		builder
			// FETCH VENDORS (LISTING PAGE)
			.addCase(fetchVendors.pending, (state) => {
				state.status = STATUS.LOADING;
				state.error = null;
			})
			.addCase(fetchVendors.fulfilled, (state, action) => {
				state.status = STATUS.SUCCEEDED;
				// The payload should be an array of Vendor objects
				state.vendors = action.payload || []; 
				state.error = null;
			})
			.addCase(fetchVendors.rejected, (state, action) => {
				state.status = STATUS.FAILED;
				state.vendors = [];
				state.error = action.payload?.message || "Failed to fetch vendor list.";
			})
			
			// GET VENDOR PROFILE (DETAIL PAGE)
			.addCase(getVendorProfile.pending, (state) => {
				// Use the same status, but it only applies to the profile fetch
				state.status = STATUS.LOADING; 
				state.selectedVendor = null;
				state.error = null;
			})
			.addCase(getVendorProfile.fulfilled, (state, action) => {
				state.status = STATUS.SUCCEEDED;
				// The payload should be a single Vendor object
				state.selectedVendor = action.payload; 
				state.error = null;
			})
			.addCase(getVendorProfile.rejected, (state, action) => {
				state.status = STATUS.FAILED;
				state.selectedVendor = null;
				state.error = action.payload?.message || "Failed to load vendor profile.";
			})

			// VENDOR REGISTRATION (Initial POST)
			.addCase(registerVendor.pending, (state) => {
				// Can use a separate status if needed, but 'status' works fine
				state.status = STATUS.LOADING;
				state.error = null;
			})
			.addCase(registerVendor.fulfilled, (state, action) => {
				state.status = STATUS.SUCCEEDED;
				// Registration usually doesn't update the list, but we can clear the error
				state.error = null;
				// You might want to display a success message via a notification system here
			})
			.addCase(registerVendor.rejected, (state, action) => {
				state.status = STATUS.FAILED;
				state.error = action.payload?.message || "Failed to register vendor.";
			});
	},
});

export const {
	clearVendorError,
	clearVendorList,
	clearSelectedVendor,
	setVendorFilters,
	resetVendorFilters,
} = vendorSlice.actions;

export default vendorSlice.reducer;