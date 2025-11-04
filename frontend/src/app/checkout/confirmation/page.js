// frontend/src/app/checkout/confirmation/page.js
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import { ENDPOINTS } from "@/axiosConfig/axios";
import axios from "@/axiosConfig/axios";
import Link from "next/link";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState("verifying");
  const [paymentData, setPaymentData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Support both 'trxref' (from Paystack) and 'reference' (fallback)
  const trxref = searchParams.get("trxref") || searchParams.get("reference");
  const status = searchParams.get("status");

  useEffect(() => {
    if (!trxref) {
      console.error("No payment reference found in URL");
      setVerificationStatus("error");
      return;
    }

    const verifyPaymentWithEndpoint = async () => {
      try {
        console.log(`🔍 Verifying payment with reference: ${trxref}`);

        const response = await axios.get(
          `${ENDPOINTS.PAYMENTS.VERIFY}/${trxref}`
        );

        const data = response.data;
        console.log("✅ Verification response:", data);

        if (data.status === "success" && data.data) {
          setVerificationStatus("success");
          setPaymentData(data.data);
        } else if (data.status === "pending") {
          // Payment is still processing
          setVerificationStatus("pending");

          // Retry verification after delay (max 3 retries)
          if (retryCount < 3) {
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
              verifyPaymentWithEndpoint();
            }, 3000); // Wait 3 seconds before retry
          }
        } else {
          setVerificationStatus("failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);

        // If 404, order might not exist yet
        if (error.response?.status === 404) {
          setVerificationStatus("not_found");
        } else if (error.response?.status === 400) {
          setVerificationStatus("failed");
        } else {
          setVerificationStatus("error");
        }
      }
    };

    verifyPaymentWithEndpoint();
  }, [trxref, retryCount]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

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
            {retryCount > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                Retry attempt {retryCount} of 3...
              </p>
            )}
          </div>
        );

      case "pending":
        return (
          <div className="text-center">
            <Loader2 className="mx-auto h-16 w-16 text-yellow-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Processing
            </h2>
            <p className="text-gray-600 mb-4">
              Your payment is being processed. This usually takes a few moments.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto mb-6">
              <p className="text-sm text-yellow-800">
                Please don&apos;t close this page. We&apos;re checking with your bank...
              </p>
            </div>
            <div className="text-sm text-gray-500">Reference: {trxref}</div>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful! 🎉
            </h2>
            <p className="text-gray-600 mb-4">
              Thank you for your purchase. Your tickets have been confirmed.
            </p>
            {paymentData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto mb-6">
                <div className="text-sm text-green-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Amount Paid:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(paymentData.amount_kobo / 100)}
                    </span>
                  </div>
                  <div className="border-t border-green-300 pt-2">
                    <div className="flex justify-between">
                      <span>Reference:</span>
                      <span className="font-mono text-xs">
                        {paymentData.reference}
                      </span>
                    </div>
                    {paymentData.customer?.first_name && (
                      <>
                        <div className="flex justify-between mt-2">
                          <span>Customer:</span>
                          <span className="font-medium">
                            {paymentData.customer.first_name}{" "}
                            {paymentData.customer.last_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Email:</span>
                          <span className="font-medium text-xs">
                            {paymentData.customer.email}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/tickets"
                className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <Download size={20} />
                View Your Tickets
              </Link>
              <div className="text-sm text-gray-500">
                <p className="mb-1">
                  A confirmation email has been sent to your inbox.
                </p>
                <Link href="/" className="text-blue-600 hover:underline">
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        );

      case "not_found":
        return (
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-yellow-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              We couldn&apos;t find this order. It may still be processing.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto mb-6">
              <p className="text-sm text-yellow-800">
                Reference: <span className="font-mono">{trxref}</span>
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                If you just completed payment, please wait a moment and refresh
                this page.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <div className="text-sm text-gray-500">
                <Link href="/support" className="text-blue-600 hover:underline">
                  Contact support
                </Link>
                {" | "}
                <Link href="/" className="text-blue-600 hover:underline">
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        );

      case "failed":
        return (
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Failed
            </h2>
            <p className="text-gray-600 mb-4">
              Your payment was not successful. No charges were made to your
              account.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-6">
              <p className="text-sm text-red-800">
                Common reasons for failed payments:
              </p>
              <ul className="text-xs text-red-700 mt-2 text-left space-y-1">
                <li>• Insufficient funds</li>
                <li>• Incorrect card details</li>
                <li>• Card limit exceeded</li>
                <li>• Bank declined transaction</li>
              </ul>
            </div>

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

      case "error":
      default:
        return (
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-orange-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Error
            </h2>
            <p className="text-gray-600 mb-4">
              We encountered an error verifying your payment.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto mb-6">
              <p className="text-sm text-orange-800">
                {trxref
                  ? `Reference: ${trxref}`
                  : "No payment reference provided"}
              </p>
              <p className="text-xs text-orange-700 mt-2">
                If you were charged, please contact support with your reference
                number.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/support"
                className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Contact Support
              </Link>
              <div className="text-sm text-gray-500">
                <Link href="/" className="text-blue-600 hover:underline">
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        );
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

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-16 w-16 text-blue-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Loading...
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
