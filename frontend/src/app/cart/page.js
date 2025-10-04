//src/app/cart/page.js

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCart } from "@/context/cartContext";
import CartUI from "@/components/cart/cartUI"; // Imports the presentation component

const SHIPPING_FEE = 10.0; // Mock shipping fee

// Utility for formatting currency
const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

/**
 * CartPage Component (Container)
 * Manages state, handles logic (checkout, quantity changes), and passes data to CartUI.
 */
export default function CartPage() {
  const { items, itemCount, addItem, removeItem, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate Subtotal and Total
  const subtotal = useMemo(() => {
    // Ensure item.price is a number before calculation
    return items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
      0
    );
  }, [items]);

  const total = subtotal + SHIPPING_FEE;

  // Handler to manage quantity changes via the CartContext
  const handleQuantityChange = (item, change) => {
    if (change < 0) {
      if (item.quantity + change <= 0) {
        removeItem(item.id);
      } else {
        // Since the context only exposes `addItem` (which upserts), we use this pattern to decrease quantity:
        // 1. Remove the old item (to reset quantity).
        // 2. Add the item back with the reduced quantity.
        removeItem(item.id);
        addItem(item, item.quantity + change);
      }
    } else if (change > 0) {
      addItem(item, change);
    }
  };

  // Mock checkout handler
  const handleCheckout = () => {
    if (itemCount === 0) return;
    setIsProcessing(true);

    // Simulate API call delay
    console.log("Processing checkout...");
    setTimeout(() => {
      console.log("Checkout successful! Thank you for your order.");
      clearCart();
      setIsProcessing(false);
    }, 1500);
  };

  // --- Empty Cart State ---
  if (itemCount === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <X size={64} className="text-gray-300 mb-4" />
        <h1
          className="text-3xl font-bold text-gray-800 mb-3"
          style={{ fontFamily: "var(--font-jakarta-sans)" }}
        >
          Your Cart is Empty
        </h1>
        <p
          className="text-gray-600 mb-8"
          style={{ fontFamily: "var(--font-onest)" }}
        >
          Looks like you haven&apos;t added any tickets or events yet.
        </p>
        <a href="/events">
          <motion.button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-lg"
            style={{ fontFamily: "var(--font-onest)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Browsing Events
          </motion.button>
        </a>
      </div>
    );
  }

  // --- Render the Presentation Component ---
  return (
    <CartUI
      items={items}
      itemCount={itemCount}
      subtotal={subtotal}
      total={total}
      isProcessing={isProcessing}
      SHIPPING_FEE={SHIPPING_FEE}
      handleQuantityChange={handleQuantityChange}
      handleCheckout={handleCheckout}
      // Pass cart context functions directly as props
      removeItem={removeItem}
      clearCart={clearCart}
      formatCurrency={formatCurrency}
    />
  );
}
