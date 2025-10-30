// frontend/src/utils/hooks/usePaystackIntegration.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/context/cartContext";
import { useRouter } from "next/navigation";
import toastAlert from "@/components/common/toast/toastAlert";

export function usePaystackIntegration({ amountInKobo, email, metadata = {} }) {
  const router = useRouter();
  const { clearCart, items } = useCart();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  // Generate a more robust reference
  const generateReference = () => {
    return `TIX_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`.toUpperCase();
  };

  // Script loading
  useEffect(() => {
    const scriptId = "paystack-script";

    if (document.getElementById(scriptId) || window.PaystackPop) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;

    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Paystack script.");
      toastAlert.error("Payment system unavailable. Please try again later.");
      setIsScriptLoaded(false);
    };

    document.head.appendChild(script);
  }, []);

  // Enhanced success handler
  const handleSuccess = useCallback(
    (response) => {
      console.log("Paystack Transaction Successful:", response);

      // Store payment reference in localStorage for backup
      localStorage.setItem("lastPaymentReference", response.reference);

      // Clear cart immediately (user experience)
      clearCart();

      // Redirect to confirmation page for server-side verification
      router.push(`/confirmation?trxref=${response.reference}&status=success`);
    },
    [clearCart, router]
  );

  // Enhanced close handler
  const handleClose = useCallback(() => {
    console.log("Paystack Checkout Modal Closed.");
    toastAlert.warn("Payment cancelled. You can try again anytime.");
  }, []);

  // Main payment execution function
  const handlePayment = useCallback(() => {
    // Validation checks
    if (!isScriptLoaded || typeof window.PaystackPop === "undefined") {
      toastAlert.error("Payment gateway not loaded yet. Please wait a moment.");
      return;
    }

    if (!PAYSTACK_PUBLIC_KEY) {
      toastAlert.error("Payment configuration error. Please contact support.");
      return;
    }

    if (!email || !email.includes("@")) {
      toastAlert.error("Valid email is required for payment.");
      return;
    }

    if (amountInKobo < 100) {
      // Minimum 1 Naira
      toastAlert.error("Invalid payment amount.");
      return;
    }

    setIsLoading(true);

    const reference = generateReference();

    // ✅ FIX: Structure metadata using Paystack's custom_fields format
    // This ensures the backend can parse it correctly
    const orderData = {
      customer: metadata.customer_info || {},
      items: items.map((item) => ({
        eventId: item.eventId,
        tierId: item.tierId,
        quantity: item.quantity,
        price: item.price,
        eventTitle: item.eventTitle,
        tierName: item.tierName,
      })),
      totals: metadata.totals || {},
    };

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: amountInKobo,
      ref: reference,
      currency: "NGN",
      channels: ["card", "bank", "ussd", "qr", "mobile_money"],
      metadata: {
        // ✅ Use custom_fields for structured data (Paystack best practice)
        custom_fields: [
          {
            display_name: "Order Details",
            variable_name: "order_details",
            value: JSON.stringify(orderData),
          },
        ],
        // Keep these for additional tracking
        reference: reference,
        timestamp: new Date().toISOString(),
        referrer: window.location.href,
      },
      callback: (response) => {
        setIsLoading(false);
        handleSuccess(response);
      },
      onClose: () => {
        setIsLoading(false);
        handleClose();
      },
    });

    handler.openIframe();
  }, [
    isScriptLoaded,
    PAYSTACK_PUBLIC_KEY,
    email,
    amountInKobo,
    metadata,
    items,
    handleSuccess,
    handleClose,
  ]);

  return {
    handlePayment,
    isScriptLoaded,
    isLoading,
    isReady: isScriptLoaded && PAYSTACK_PUBLIC_KEY,
  };
}
