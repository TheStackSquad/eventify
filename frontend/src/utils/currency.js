// frontend/src/utils/currency.js
export const SERVICE_FEE = Number(process.env.NEXT_PUBLIC_SERVICE_FEE) || 500;
export const VAT_RATE = Number(process.env.NEXT_PUBLIC_VAT_RATE) || 0.075;

export const formatCurrency = (amount) => {
  return `₦${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const calculateOrderTotals = (subtotal) => {
  const vatAmount = subtotal * VAT_RATE;
  const finalTotal = subtotal + SERVICE_FEE + vatAmount;

  return {
    subtotal,
    serviceFee: SERVICE_FEE,
    vatAmount,
    finalTotal,
    amountInKobo: Math.round(finalTotal * 100), // For Paystack
  };
};
