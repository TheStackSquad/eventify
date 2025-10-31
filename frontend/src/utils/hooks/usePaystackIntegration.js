// frontend/src/utils/hooks/usePaystackIntegration.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/context/cartContext";
import { useRouter } from "next/navigation";
import toastAlert from "@/components/common/toast/toastAlert";
import { API_ENDPOINTS } from "@/utils/constants/globalConstants"; // <-- New Import

export function usePaystackIntegration({ amountInKobo, email, metadata = {} }) {
  const router = useRouter();
  const { clearCart, items } = useCart();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  // NOTE: generateReference is no longer needed as the backend will handle this securely.
  // ... (Script Loading useEffect remains the same)

  // Enhanced success handler - modified to accept the DB-generated reference
  const handleSuccess = useCallback(
    (response, dbReference) => {
      // Use dbReference for clarity
      console.log("✅ Paystack Transaction Successful:", response);

      // Store payment reference in localStorage for backup
      localStorage.setItem("lastPaymentReference", response.reference);

      clearCart();

      // Redirect to confirmation page for server-side verification
      // The response.reference will match the dbReference used to open Paystack
      router.push(`${API_ENDPOINTS.PAYMENTS.VERIFY}/${response.reference}`); // Use VERIFY path constant
    },
    [clearCart, router]
  );

  // Enhanced close handler
  const handleClose = useCallback(() => {
    console.log("Paystack Checkout Modal Closed.");
    toastAlert.warn("Payment cancelled. You can try again anytime.");
  }, []);

  // --- Main Payment Execution Function ---
  const handlePayment = useCallback(async () => {
    // **CHANGED TO ASYNC**
    // 1. Validation checks (keep these)
    if (
      !isScriptLoaded ||
      typeof window.PaystackPop === "undefined" ||
      !PAYSTACK_PUBLIC_KEY ||
      !email ||
      !email.includes("@") ||
      amountInKobo < 100
    ) {
      toastAlert.error(
        "Payment validation failed. Check email or gateway status."
      );
      return;
    }

    setIsLoading(true);

    try {
      // --- STEP 2: POST TO BACKEND TO CREATE PENDING ORDER (CRITICAL DB WRITE) ---
      const orderInitializationData = {
        // Send all necessary info for backend to calculate, validate, and store
        email: email,
        amountInKobo: amountInKobo,
        items: items, // Send cart items for server-side validation/storage
        customerInfo: metadata.customer_info || {},
      };

      // 🎯 Call the new initialization endpoint
      const response = await fetch(API_ENDPOINTS.ORDERS.INITIALIZE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderInitializationData),
      });

      const result = await response.json();

      // Check API response success and ensure the secure reference is returned
      if (
        !response.ok ||
        result.status !== "success" ||
        !result.data ||
        !result.data.reference
      ) {
        // This error will be caught below
        throw new Error(
          result.message || "Failed to initialize order on server."
        );
      }

      const dbReference = result.data.reference; // 🎯 SECURE REFERENCE FROM DB
      console.log("✅ Pending Order Created on Server with Ref:", dbReference);

      // --- STEP 3: SETUP Paystack Configuration ---
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: amountInKobo,
        ref: dbReference, // **CRITICAL: Use the DB-generated reference**
        currency: "NGN",
        channels: ["card", "bank", "ussd", "qr", "mobile_money"],
        metadata: {
          // Only minimal data needed here, as the DB has the rest
          reference: dbReference,
          timestamp: new Date().toISOString(),
        },
        callback: (response) => {
          setIsLoading(false);
          // Pass the DB reference to the success handler
          handleSuccess(response, dbReference);
        },
        onClose: () => {
          setIsLoading(false);
          handleClose();
        },
      });

      // 4. Open Paystack popup (Only runs if the DB POST was successful)
      handler.openIframe();
    } catch (error) {
      // Handle server-side initialization failure
      console.error("Payment initialization failed:", error);
      toastAlert.error(
        error.message || "Could not start payment. Please try again."
      );
      setIsLoading(false);
    }
  }, [
    isScriptLoaded,
    PAYSTACK_PUBLIC_KEY,
    email,
    amountInKobo,
    items, // Dependency for cart items
    metadata,
    handleSuccess,
    handleClose,
  ]);

  // --- Return Values (remains the same) ---
  return {
    handlePayment,
    isScriptLoaded,
    isLoading,
    isReady: isScriptLoaded && !!PAYSTACK_PUBLIC_KEY,
  };
}