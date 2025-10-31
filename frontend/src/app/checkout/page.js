// frontend/src/app/checkout/page.js
"use client";

import { useMemo, useState, useEffect, useCallback } from "react"; // Added useCallback
import { useCart } from "@/context/cartContext";
import PaystackCheckout from "@/components/checkoutUI/checkout";
import CustomerForm from "@/components/checkoutUI/customerForm";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, CheckCircle } from "lucide-react";
import { calculateOrderTotals, formatCurrency } from "@/utils/currency";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, itemCount, totalAmount } = useCart();

  const [customerInfo, setCustomerInfo] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false); // This is now controlled by CustomerForm
  const [userData, setUserData] = useState(null);

  // Get user data from auth context/localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log(
          "LOG 1: User Data Structure (from localStorage/Auth):",
          user
        );
        setUserData(user);

        // Auto-fill form if user is authenticated
        if (user && user.email) {
          // *** REFACTORED: Removed 'address' field from auto-fill state ***
          setCustomerInfo({
            firstName: user.name?.split(" ")[0] || "",
            lastName: user.name?.split(" ").slice(1).join(" ") || "",
            email: user.email,
            phone: "",
            city: "",
            state: "",
            country: "Nigeria",
          });
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Calculate order totals
  const { subtotal, serviceFee, vatAmount, finalTotal, amountInKobo } =
    useMemo(() => {
      const calculatedSubtotal =
        totalAmount !== undefined && totalAmount !== null
          ? totalAmount
          : items.reduce(
              (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
              0
          );
      return calculateOrderTotals(calculatedSubtotal);
    }, [items, totalAmount]);
  
  console.log("LOG 2: Final Order Totals Structure:", {
    subtotal,
    serviceFee,
    vatAmount,
    finalTotal,
    amountInKobo,
  });

  // Handle customer info updates from form (data)
  const handleCustomerInfoChange = useCallback((info) => {
    console.log("Customer Info Structure:", info);
    setCustomerInfo(info);
  }, []);

  // *** NEW: Handler to receive validation status from CustomerForm (validity) ***
  const handleFormValidation = useCallback((isValid) => {
    setIsFormValid(isValid);
  }, []);

  // Redirect if cart is empty
  if (itemCount === 0) {
    return (
      <div className="p-8 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <p className="text-xl font-medium text-gray-700 mb-4">
          Your cart is empty. Nothing to checkout.
        </p>
        <Link href="/events" className="text-blue-600 hover:underline">
          Go back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
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

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Customer Info & Payment */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Information Section */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <CustomerForm
              onCustomerInfoChange={handleCustomerInfoChange}
              onValidationChange={handleFormValidation} // *** NEW PROP ***
              initialData={{ user: userData }}
            />
          </div>

          {/* Payment Section */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-red-700 mb-6">
              Payment Method
            </h2>

            {isFormValid && customerInfo ? (
              <PaystackCheckout
                amountInKobo={amountInKobo}
                email={customerInfo.email}
                totalAmount={finalTotal}
                formatCurrency={formatCurrency}
                metadata={{
                  customer_info: {
                    firstName: customerInfo.firstName,
                    lastName: customerInfo.lastName,
                    email: customerInfo.email,
                    phone: customerInfo.phone,
                    city: customerInfo.city,
                    state: customerInfo.state,
                  },
                }}
              />
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <User className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Complete Customer Information
                </h3>
                <p className="text-gray-500">
                  Please fill in all required customer details above to proceed
                  with payment.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-gray-50 p-6 rounded-xl shadow-inner border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <CheckCircle className="mr-2" size={20} />
              Order Summary
            </h2>

            {/* Customer Info Preview */}
            {customerInfo && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-1">
                  {customerInfo.firstName} {customerInfo.lastName}
                </p>
                <p className="text-xs text-green-600">{customerInfo.email}</p>
                <p className="text-xs text-green-600">{customerInfo.phone}</p>
              </div>
            )}

            <div className="space-y-2 text-gray-700 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} tickets)</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span className="font-medium">
                  {formatCurrency(serviceFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VAT (7.5%)</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-extrabold text-red-600">
                <span>Total</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {/* Order Items List */}
            <div className="mt-6 pt-4 border-t border-gray-300">
              <h4 className="font-medium text-gray-800 mb-3">Your Tickets</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.cartId}
                    className="flex justify-between items-start text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 line-clamp-1">
                        {item.eventTitle}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {item.tierName} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-gray-700 ml-2">
                      {formatCurrency(Number(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
