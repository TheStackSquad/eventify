//src/components/cart/cartUI.js
"use client";
import Image from "next/image";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus } from "lucide-react";

// --- Placeholder Component for Cart Item Image ---
// NOTE: We keep the image component here as it's purely presentation related
const CartItemImage = ({ src, alt, width = 64, height = 64 }) => {
  const [imageError, setImageError] = useState(false);
  // Use a simple fetchable placeholder image URL
  const finalSrc =
    imageError || !src
      ? "https://placehold.co/64x64/e0f2fe/0369a1?text=Event"
      : src;

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: width, height: height }}
    >
      <image
        src={finalSrc}
        alt={alt || "Cart Item"}
        width={width}
              height={height}
              fill
        className="rounded-lg object-cover shadow-sm w-full h-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default function CartUI({
  items,
  itemCount,
  subtotal,
  total,
  isProcessing,
  SHIPPING_FEE,
  handleQuantityChange,
  handleCheckout,
  removeItem,
  clearCart,
  formatCurrency,
}) {
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1
        className="text-4xl font-extrabold text-gray-900 mb-8"
        style={{ fontFamily: "var(--font-jakarta-sans)" }}
      >
        Your Shopping Cart
      </h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-10">
        {/* === Cart Items List (Column 1 & 2) === */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100"
            >
              <CartItemImage src={item.imageSrc} alt={item.name} />

              <div className="flex-1 min-w-0 ml-4">
                <h3
                  className="text-lg font-semibold text-gray-800 truncate"
                  style={{ fontFamily: "var(--font-jakarta-sans)" }}
                >
                  {item.name}
                </h3>
                <p
                  className="text-sm text-gray-500"
                  style={{ fontFamily: "var(--font-onest)" }}
                >
                  {formatCurrency(item.price)} per item
                </p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-2 mr-4 flex-shrink-0">
                <motion.button
                  onClick={() => handleQuantityChange(item, -1)}
                  disabled={item.quantity <= 1}
                  className="p-1 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <Minus size={16} />
                </motion.button>

                <span
                  className="font-medium w-6 text-center text-gray-800"
                  style={{ fontFamily: "var(--font-onest)" }}
                >
                  {item.quantity}
                </span>

                <motion.button
                  onClick={() => handleQuantityChange(item, 1)}
                  className="p-1 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <Plus size={16} />
                </motion.button>
              </div>

              {/* Item Total and Remove Button */}
              <div className="flex flex-col items-end flex-shrink-0">
                <p
                  className="text-lg font-bold text-blue-600 mb-2"
                  style={{ fontFamily: "var(--font-jakarta-sans)" }}
                >
                  {formatCurrency(Number(item.price) * item.quantity)}
                </p>
                <motion.button
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                  aria-label="Remove item"
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 size={18} />
                </motion.button>
              </div>
            </motion.div>
          ))}

          <div className="flex justify-end pt-4">
            <motion.button
              onClick={clearCart}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 size={16} />
              <span>Clear Cart</span>
            </motion.button>
          </div>
        </div>

        {/* === Summary & Checkout (Column 3) === */}
        <div className="lg:col-span-1 mt-10 lg:mt-0">
          <div className="sticky top-24 bg-blue-50 p-6 rounded-xl shadow-xl border border-blue-100">
            <h2
              className="text-2xl font-bold text-blue-900 mb-4"
              style={{ fontFamily: "var(--font-jakarta-sans)" }}
            >
              Order Summary
            </h2>

            <div
              className="space-y-3 text-gray-700"
              style={{ fontFamily: "var(--font-onest)" }}
            >
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span className="font-medium">
                  {formatCurrency(SHIPPING_FEE)}
                </span>
              </div>

              <div className="border-t border-blue-200 pt-3 flex justify-between text-xl font-extrabold text-blue-800">
                <span>Order Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <motion.button
              onClick={handleCheckout}
              disabled={isProcessing || itemCount === 0}
              className={`mt-6 w-full py-3 text-white rounded-lg font-semibold transition-all duration-300 shadow-md ${
                isProcessing || itemCount === 0
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              style={{ fontFamily: "var(--font-onest)" }}
              whileHover={{ scale: isProcessing || itemCount === 0 ? 1 : 1.02 }}
              whileTap={{ scale: isProcessing || itemCount === 0 ? 1 : 0.98 }}
            >
              {isProcessing ? "Processing..." : "Proceed to Checkout"}
            </motion.button>

            <p
              className="mt-4 text-center text-sm text-gray-500"
              style={{ fontFamily: "var(--font-onest)" }}
            >
              Shipping calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
