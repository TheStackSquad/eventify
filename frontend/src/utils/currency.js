// frontend/src/utils/currency.js

// ============================================================================
// FEE CONFIGURATION - MATCHES BACKEND EXACTLY
// ============================================================================
// CRITICAL: These calculations MUST match backend/pkg/shared/fee_config.go

const VAT_RATE = 0.075; // 7.5%

// Tier thresholds (in Naira)
const TIER_ONE_CAP = 2500;
const TIER_TWO_CAP = 10000;
const TIER_THREE_CAP = 50000;

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate service fee based on tiered percentage model
 * MUST MATCH: backend/pkg/shared/fee_config.go:CalculateServiceFee
 *
 * Pricing Tiers:
 *   - ₦0 - ₦2,500:      Flat ₦200
 *   - ₦2,501 - ₦10,000: 8% of subtotal
 *   - ₦10,001 - ₦50,000: 6% of subtotal
 *   - Above ₦50,000:    4% of subtotal
 *
 * @param {number} subtotal - Subtotal in Naira
 * @returns {number} Service fee in Naira
 */
export const calculateServiceFee = (subtotal) => {
  if (subtotal <= TIER_ONE_CAP) {
    // Tier 1: Flat ₦200 for small transactions
    return 200;
  } else if (subtotal <= TIER_TWO_CAP) {
    // Tier 2: 8% for ₦2,501 - ₦10,000
    return Math.round(subtotal * 0.08);
  } else if (subtotal <= TIER_THREE_CAP) {
    // Tier 3: 6% for ₦10,001 - ₦50,000
    return Math.round(subtotal * 0.06);
  } else {
    // Tier 4: 4% for expensive tickets
    return Math.round(subtotal * 0.04);
  }
};


export const calculateVAT = (amount) => {
  return Math.round(amount * VAT_RATE);
};


export const calculateOrderTotals = (subtotal) => {
  const serviceFee = calculateServiceFee(subtotal);

  // VAT is calculated on (subtotal + service_fee)
  const taxableAmount = subtotal + serviceFee;
  const vatAmount = calculateVAT(taxableAmount);

  const finalTotal = subtotal + serviceFee + vatAmount;

  return {
    subtotal,
    serviceFee,
    vatAmount,
    finalTotal,
    amountInKobo: Math.round(finalTotal * 100), // For Paystack
  };
};


export const getFeeTier = (subtotal) => {
  if (subtotal <= TIER_ONE_CAP) {
    return "Flat ₦200 fee";
  } else if (subtotal <= TIER_TWO_CAP) {
    return "8% service fee";
  } else if (subtotal <= TIER_THREE_CAP) {
    return "6% service fee";
  } else {
    return "4% service fee";
  }
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export const formatCurrency = (amount) => {
  return `₦${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const nairaToKobo = (naira) => {
  return Math.round(naira * 100);
};

export const koboToNaira = (kobo) => {
  return kobo / 100;
};

// ============================================================================
// LEGACY SUPPORT (for backward compatibility)
// ============================================================================

// Deprecated: Use calculateServiceFee() instead
export const SERVICE_FEE = 500; // Only for old code compatibility

// Deprecated: Use calculateVAT() instead
export const VAT_RATE_CONSTANT = VAT_RATE;
