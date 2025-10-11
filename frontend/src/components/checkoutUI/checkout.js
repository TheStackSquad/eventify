//frontend/src/component/checkoutUI/checkout.js
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import toastAlert  from "@/components/common/toast/toastAlert";
import { useCart } from "@/context/cartContext";
import { useRouter } from "next/navigation";

// --- Paystack SDK Loading and Hook Simulation ---

// Mock Paystack public key (REPLACE THIS WITH YOUR ACTUAL KEY IN PRODUCTION)
const PAYSTACK_PUBLIC_KEY = "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

/**
 * Custom hook to manage Paystack integration (simulated for single file environment)
 */
const usePaystackIntegration = (
  amountInKobo,
  email,
  totalAmount,
  formatCurrency
) => {
  const { items, clearCart } = useCart();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isPaystackReady, setIsPaystackReady] = useState(false);

  // 1. Load Paystack script
  useEffect(() => {
    if (typeof window === "undefined" || window.PaystackPop) {
      setIsPaystackReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setIsPaystackReady(true);
    script.onerror = () => {
      console.error("Failed to load Paystack script.");
      toastAlert.error("Payment system unavailable. Please try again later.");
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // 2. Handler function for payment
  const initializePayment = (onSuccess, onClose) => {
    if (!isPaystackReady || typeof window.PaystackPop === "undefined") {
      toastAlert.error("Payment gateway not loaded yet. Please wait a moment.");
      return;
    }

    setIsLoading(true);

    // Configuration object for PaystackPop.setup
    const config = {
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: amountInKobo, // amount in kobo
      ref: "PAY-" + Math.floor(Math.random() * 1000000000 + 1), // unique transaction reference
      metadata: {
        cart_items: JSON.stringify(
          items.map((item) => ({
            eventId: item.eventId,
            tierId: item.tierId,
            qty: item.quantity,
          }))
        ),
      },
      callback: (response) => {
        setIsLoading(false);
        // In a real app, you would verify this transaction server-side.

        // --- MOCK SUCCESS PATH ---
        toastAlert.success(
          "Payment successful! Redirecting to confirmation..."
        );
        clearCart();
        // Redirect to a confirmation page (you'd need to create this page)
        router.push("/confirmation?ref=" + response.reference);
        onSuccess(response);
      },
      onClose: () => {
        setIsLoading(false);
        toastAlert.warn("Transaction cancelled by user.");
        onClose();
      },
    };

    const handler = window.PaystackPop.setup(config);
    handler.openIframe();
  };

  const handlePaystackPayment = () => {
    initializePayment(
      () => console.log("Payment completed successfully."),
      () => console.log("Payment closed by user.")
    );
  };

  return {
    handlePaystackPayment,
    isLoading,
    isPaystackReady,
    totalAmount,
    formatCurrency,
  };
};

/**
 * PaystackCheckout Component (Presentation)
 */
export default function PaystackCheckout({
  amountInKobo,
  email,
  totalAmount,
  formatCurrency,
}) {
  // Pass essential data to the custom hook
  const { handlePaystackPayment, isLoading, isPaystackReady } =
    usePaystackIntegration(amountInKobo, email, totalAmount, formatCurrency);

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        You are about to securely pay for tickets worth
        <span className="font-bold text-red-600 ml-1">
          {formatCurrency(totalAmount)}
        </span>{" "}
        via Paystack.
      </p>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
        <AlertTriangle
          size={20}
          className="text-yellow-600 flex-shrink-0 mt-0.5"
        />
        <p className="text-sm text-yellow-800">
          This is a **simulated** Paystack integration for demonstration using a
          mock key. In a real application, you must replace the mock key
          (`pk_test_...`) with your live public key.
        </p>
      </div>

      <motion.button
        onClick={handlePaystackPayment}
        disabled={isLoading || !isPaystackReady}
        className={`w-full flex items-center justify-center py-3 px-4 font-bold text-lg rounded-xl transition-all duration-300 transform shadow-lg ${
          isLoading || !isPaystackReady
            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
            : "bg-green-600 text-white hover:bg-green-700 active:scale-98"
        }`}
        whileHover={{ scale: isLoading || !isPaystackReady ? 1 : 1.01 }}
        whileTap={{ scale: isLoading || !isPaystackReady ? 1 : 0.99 }}
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="mr-2 animate-spin" />
            Awaiting Payment...
          </>
        ) : !isPaystackReady ? (
          <>
            <Loader2 size={20} className="mr-2 animate-spin" />
            Loading Gateway...
          </>
        ) : (
          <>
            <CreditCard size={20} className="mr-2" />
            Pay Now {formatCurrency(totalAmount)}
          </>
        )}
      </motion.button>

      <div className="text-center text-sm text-gray-500 pt-2">
        Powered by Paystack. Your payment details are secure.
      </div>
    </div>
  );
}
