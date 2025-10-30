// frontend/src/app/confirmation/page.js
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import Link from "next/link";

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState("verifying");
  const [paymentData, setPaymentData] = useState(null);

  const trxref = searchParams.get("trxref");
  const status = searchParams.get("status");

  useEffect(() => {
    if (!trxref) {
      setVerificationStatus("error");
      return;
    }

    // Verify payment with backend
    const verifyPayment = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/verify/${trxref}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Verification failed");
        }

        const data = await response.json();

        if (data.status === "success") {
          setVerificationStatus("success");
          setPaymentData(data.data);
        } else {
          setVerificationStatus("failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setVerificationStatus("error");
      }
    };

    verifyPayment();
  }, [trxref]);

  const renderContent = () => {
    switch (verificationStatus) {
      case "verifying":
        return (
          <div className="text-center">
            <Loader2 className="mx-auto h-16 w-16 text-blue-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Payment
            </h2>
            <p className="text-gray-600 mb-4">
              Please wait while we confirm your payment...
            </p>
            <div className="text-sm text-gray-500">Reference: {trxref}</div>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Thank you for your purchase. Your tickets have been reserved.
            </p>
            {paymentData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto mb-6">
                <div className="text-sm text-green-800 space-y-2">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">
                      ₦{(paymentData.amount / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-medium">{paymentData.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-medium">
                      {paymentData.customer?.firstName}{" "}
                      {paymentData.customer?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-medium">
                      {paymentData.customer?.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/tickets"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                View Your Tickets
              </Link>
              <div className="text-sm text-gray-500">
                <Link href="/" className="text-blue-600 hover:underline">
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        );

      case "failed":
      case "error":
        return (
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment{" "}
              {verificationStatus === "failed"
                ? "Failed"
                : "Verification Error"}
            </h2>
            <p className="text-gray-600 mb-4">
              {verificationStatus === "failed"
                ? "Your payment was not successful. Please try again."
                : "We encountered an error verifying your payment. Please contact support."}
            </p>

            <div className="space-y-3">
              <Link
                href="/checkout"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </Link>
              <div className="text-sm text-gray-500">
                <Link href="/" className="text-blue-600 hover:underline">
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {renderContent()}
      </div>
    </div>
  );
}
