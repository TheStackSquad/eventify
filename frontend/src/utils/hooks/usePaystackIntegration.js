//frontend/src/utils/hooks/usePaysatckIntegration.js

"use client";

import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/context/cartContext";
import { useRouter } from "next/navigation";
import toastAlert from "@/components/common/toast/toastAlert";
import { ENDPOINTS } from "@/axiosConfig/axios";
import axios from "@/axiosConfig/axios";

export function usePaystackIntegration({
  amountInKobo,
  email,
  metadata
}) {
  const router = useRouter();
  const { clearCart, items } = useCart();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

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

    return () => {
      if (document.getElementById(scriptId)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleSuccess = useCallback(
    (response) => {
      console.log("✅ Paystack Transaction Successful:", response);
      localStorage.setItem("lastPaymentReference", response.reference);
      clearCart();

      // 💡 FIX: Redirect to a frontend page, passing the reference as a query parameter.
      router.push(`/checkout/confirmation?reference=${response.reference}`);
    },
    [clearCart, router]
  );

  const handleClose = useCallback(() => {
    console.log("Paystack Checkout Modal Closed.");
    toastAlert.warn("Payment cancelled. You can try again anytime.");
  }, []);

  const handlePayment = useCallback(async () => {
    if (
      !isScriptLoaded ||
      !window.PaystackPop ||
      !PAYSTACK_PUBLIC_KEY ||
      !email?.includes("@") ||
      amountInKobo < 100
    ) {
      toastAlert.error(
        "Payment validation failed. Check email or gateway status."
      );
      return;
    }

    setIsLoading(true);

    try {
      const orderInitializationData = {
        email,
        amountInKobo,
        items,
        metadata,
      };

      // ADDED LOGGING HERE
      const initializationEndpoint =
        axios.defaults.baseURL + ENDPOINTS.ORDERS.INITIALIZE;
      console.log(
        `📡 Attempting to initialize order: POST ${initializationEndpoint}`
      );
      console.log(
        "   Payload:",
        JSON.stringify(orderInitializationData, null, 2)
      );
      // END LOGGING

      const response = await axios.post(
        ENDPOINTS.ORDERS.INITIALIZE,
        orderInitializationData
      );

      const result = response.data;

      // NOTE: We check for status:"success" which the Go backend now sends.
      // The backend response is: { status: "success", data: { reference: "..." } }
      if (result.status !== "success" || !result.data?.reference) {
        throw new Error(
          result.message || "Failed to initialize order on server."
        );
      }

      const dbReference = result.data.reference;
      console.log("✅ Pending Order Created on Server with Ref:", dbReference);

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email,
        amount: amountInKobo,
        ref: dbReference,
        currency: "NGN",
        channels: ["card", "bank", "ussd", "qr", "mobile_money"],
        metadata: {
          reference: dbReference,
          timestamp: new Date().toISOString(),
        },
        callback: (response) => {
          setIsLoading(false);
          // FIX: Only passing the Paystack response to handleSuccess
          handleSuccess(response);
        },
        onClose: () => {
          setIsLoading(false);
          handleClose();
        },
      });

      handler.openIframe();
    } catch (error) {
      const serverMessage = error.response?.data?.message || error.message;
      console.error("Payment initialization failed:", error);
      toastAlert.error(
        serverMessage || "Could not start payment. Please try again."
      );
      setIsLoading(false);
    }
  }, [
    isScriptLoaded,
    PAYSTACK_PUBLIC_KEY,
    email,
    amountInKobo,
    items,
    metadata,
    handleSuccess,
    handleClose,
  ]);

  return {
    handlePayment,
    isScriptLoaded,
    isLoading,
    isReady: isScriptLoaded && !!PAYSTACK_PUBLIC_KEY,
  };
}
