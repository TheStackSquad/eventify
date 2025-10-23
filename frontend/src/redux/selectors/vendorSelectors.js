// frontend/src/redux/selectors/vendorSelectors.js
import { createSelector } from "@reduxjs/toolkit";

// ============================================
// BASIC SELECTORS - Direct state access
// ============================================

export const selectVendorsState = (state) => state.vendors;

// ✅ SIMPLIFIED: Direct array access
export const selectAllVendors = (state) => selectVendorsState(state).vendors;

// ✅ NEW: Separate status selectors for each operation
export const selectFetchStatus = (state) =>
  selectVendorsState(state).fetchStatus;
export const selectProfileStatus = (state) =>
  selectVendorsState(state).profileStatus;
export const selectRegisterStatus = (state) =>
  selectVendorsState(state).registerStatus;

// ✅ NEW: Separate error selectors
export const selectFetchError = (state) => selectVendorsState(state).fetchError;
export const selectProfileError = (state) =>
  selectVendorsState(state).profileError;
export const selectRegisterError = (state) =>
  selectVendorsState(state).registerError;

// ✅ KEEP: Common selectors
export const selectVendorFilters = (state) => selectVendorsState(state).filters;
export const selectPagination = (state) => selectVendorsState(state).pagination;
export const selectSelectedVendor = (state) =>
  selectVendorsState(state).selectedVendor;

// ============================================
// BACKWARD COMPATIBILITY (for existing code)
// ============================================

// ✅ Map old selector names to new ones
export const selectVendorsStatus = selectFetchStatus; // Most code uses this for fetch status
export const selectVendorsError = selectFetchError;

// ============================================
// MEMOIZED SELECTORS - Computed values
// ============================================

// ✅ SIMPLIFIED: Find vendor by ID from flat array
export const selectVendorById = createSelector(
  [selectAllVendors, (state, vendorId) => vendorId],
  (vendors, vendorId) => {
    if (!vendorId) return null;
    return vendors.find((vendor) => vendor.id === vendorId) || null;
  }
);

// ✅ SIMPLIFIED: Just return the array (pagination done by backend)
export const selectPaginatedVendors = createSelector(
  [selectAllVendors],
  (vendors) => vendors
);

// ✅ SIMPLIFIED: Count from pagination metadata
export const selectTotalVendorsCount = createSelector(
  [selectPagination],
  (pagination) => pagination.totalCount || 0
);

// ✅ SIMPLIFIED: Check if more pages available
export const selectHasMoreVendors = createSelector(
  [selectPagination, selectAllVendors],
  (pagination, vendors) => {
    const { currentPage, pageSize, totalCount } = pagination;

    // If backend provides totalCount, use it
    if (totalCount > 0) {
      return currentPage * pageSize < totalCount;
    }

    // Fallback: assume more if we got a full page
    return vendors.length === pageSize;
  }
);

// ✅ OPTIONAL: Client-side filtering (if needed)
// Note: Ideally filtering should be done by backend
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

    // Apply category filter (if not already filtered by backend)
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
// LOADING STATE HELPERS
// ============================================

// ✅ NEW: Check if any fetch operation is loading
export const selectIsFetchLoading = createSelector(
  [selectFetchStatus],
  (status) => status === "loading"
);

// ✅ NEW: Check if profile is loading
export const selectIsProfileLoading = createSelector(
  [selectProfileStatus],
  (status) => status === "loading"
);

// ✅ NEW: Check if any operation failed
export const selectHasFetchError = createSelector(
  [selectFetchError],
  (error) => error !== null
);
