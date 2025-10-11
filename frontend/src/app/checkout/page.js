//frontend/src/component/checkoutUI/checkout.js
"use client";

import { useMemo } from "react";
import { useCart } from "@/context/cartContext";
import PaystackCheckout from "@/components/checkoutUI/checkout";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// --- Fee & Currency Configuration ---
const SERVICE_FEE = 500; // Mock Service Fee in Naira (₦)
const VAT_RATE = 0.075; // 7.5% VAT (Standard Nigerian VAT)

// Utility for formatting currency
const formatCurrency = (amount) => {
  return `₦${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * CheckoutPage Component (Container)
 * Loads cart data and passes summary to Paystack component.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, itemCount, totalAmount } = useCart();

  // Calculate totals
  const subtotal = useMemo(() => {
    if (totalAmount !== undefined && totalAmount !== null) return totalAmount;

    return items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
      0
    );
  }, [items, totalAmount]);

  const vatAmount = subtotal * VAT_RATE;
  const finalTotal = subtotal + SERVICE_FEE + vatAmount;

  // Paystack requires amount in kobo (cents/smallest currency unit)
  const amountInKobo = Math.round(finalTotal * 100);

  // Redirect if cart is empty
  if (itemCount === 0) {
    return (
      <div className="p-8 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <p className="text-xl font-medium text-gray-700 mb-4">
          Your cart is empty. Nothing to checkout.
        </p>
        <Link href="/" className="text-blue-600 hover:underline">
          Go back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-gray-600 hover:text-red-600 transition-colors font-medium"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Cart
      </button>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-2">
        Secure Checkout
      </h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Order Summary Column */}
        <div className="md:col-span-1 bg-gray-50 p-6 rounded-xl shadow-inner h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Summary</h2>
          <div className="space-y-2 text-gray-700 text-sm">
            <div className="flex justify-between">
              <span>Subtotal ({itemCount} tickets)</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee</span>
              <span className="font-medium">{formatCurrency(SERVICE_FEE)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({VAT_RATE * 100}%)</span>
              <span className="font-medium">{formatCurrency(vatAmount)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-extrabold text-red-600">
              <span>Total</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Paystack Payment Column */}
        <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-700 mb-6">
            Payment Method
          </h2>

          <PaystackCheckout
            amountInKobo={amountInKobo}
            email="user@example.com" // Mock Email
            totalAmount={finalTotal}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </div>
  );
}
