// frontend/src/redux/selectors/vendorSelectors.js

// Import createSelector only for actual derived calculations
import { createSelector } from "@reduxjs/toolkit";

// ============================================
// BASIC SELECTORS - Direct state access (NO createSelector needed)
// ============================================

export const selectVendorsState = (state) => state.vendors;

// 🟢 FIX 1: SIMPLIFIED - Use simple function instead of createSelector wrapper
// Note: This matches the array selected by the component (selectPaginatedVendors)
export const selectAllVendors = (state) => selectVendorsState(state).vendors;

// Status Selectors
export const selectFetchStatus = (state) =>
  selectVendorsState(state).fetchStatus;
export const selectProfileStatus = (state) =>
  selectVendorsState(state).profileStatus;
export const selectRegisterStatus = (state) =>
  selectVendorsState(state).registerStatus;

// Error Selectors
export const selectFetchError = (state) => selectVendorsState(state).fetchError;
export const selectProfileError = (state) =>
  selectVendorsState(state).profileError;
export const selectRegisterError = (state) =>
  selectVendorsState(state).registerError;

// Common Selectors
export const selectVendorFilters = (state) => selectVendorsState(state).filters;
export const selectPagination = (state) => selectVendorsState(state).pagination;
export const selectSelectedVendor = (state) =>
  selectVendorsState(state).selectedVendor;

// 🟢 FIX 2: SIMPLIFIED - Count from pagination metadata (Direct access is fine)
// Replaced createSelector( [selectPagination], (p) => p.totalCount || 0 )
export const selectTotalVendorsCount = (state) =>
  selectPagination(state).totalCount || 0;

// ============================================
// BACKWARD COMPATIBILITY (for existing code)
// ============================================

export const selectVendorsStatus = selectFetchStatus;
export const selectVendorsError = selectFetchError;

// ============================================
// MEMOIZED SELECTORS - Computed values (createSelector is correct here)
// ============================================

// ✅ CORRECT: Transformation logic (find) requires memoization
export const selectVendorById = createSelector(
  [selectAllVendors, (state, vendorId) => vendorId],
  (vendors, vendorId) => {
    if (!vendorId) return null;
    return vendors.find((vendor) => vendor.id === vendorId) || null;
  }
);

// 🟢 FIX 3: REMOVED redundant createSelector. Map to the simple extractor.
// The component was likely calling useSelector(selectPaginatedVendors)
export const selectPaginatedVendors = selectAllVendors;

// ✅ CORRECT: Calculation requires memoization
export const selectHasMoreVendors = createSelector(
  [selectPagination, selectAllVendors],
  (pagination, vendors) => {
    const { currentPage, pageSize, totalCount } = pagination;

    // Use totalCount if available
    if (totalCount > 0) {
      return currentPage * pageSize < totalCount;
    }

    // Fallback: Check if we received a full page (assuming pagination limit applies)
    return vendors.length === pageSize;
  }
);

// ✅ CORRECT: Transformation logic (filtering) requires memoization
export const selectFilteredVendors = createSelector(
  [selectAllVendors, selectVendorFilters],
  (vendors, filters) => {
    let filtered = vendors;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (vendor) =>
          vendor.name?.toLowerCase().includes(searchTerm) ||
          vendor.category?.toLowerCase().includes(searchTerm) ||
          vendor.city?.toLowerCase().includes(searchTerm) ||
          vendor.state?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(
        (vendor) => vendor.category === filters.category
      );
    }

    // Apply state filter
    if (filters.state) {
      filtered = filtered.filter((vendor) => vendor.state === filters.state);
    }

    // Apply min price filter
    if (filters.minPrice && filters.minPrice > 0) {
      filtered = filtered.filter(
        (vendor) => (vendor.min_price || vendor.minPrice) >= filters.minPrice
      );
    }

    return filtered;
  }
);

// ============================================
// LOADING STATE HELPERS (createSelector is correct here as they derive a boolean)
// ============================================

// ✅ CORRECT: Calculation requires memoization
export const selectIsFetchLoading = createSelector(
  [selectFetchStatus],
  (status) => status === "loading"
);

// ✅ CORRECT: Calculation requires memoization
export const selectIsProfileLoading = createSelector(
  [selectProfileStatus],
  (status) => status === "loading"
);

// ✅ CORRECT: Calculation requires memoization
export const selectHasFetchError = createSelector(
  [selectFetchError],
  (error) => error !== null
);
