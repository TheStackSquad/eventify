//src/context/cartContext.js

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

// Define the Cart structure
const CartContext = createContext(null);

// Custom hook for easy access to cart state and actions
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    // This check is crucial to ensure the hook is used inside the provider
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

// Default value for cart initialization
const initialCartState = {
  items: [],
};

// Provider component
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(initialCartState);

  // --- Persistence Logic (Load from localStorage) ---
  useEffect(() => {
    // Check if running on the client (browser) before accessing localStorage
    if (typeof window !== "undefined") {
      const storedCart = localStorage.getItem("eventify_cart");
      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch (e) {
          console.error("Could not parse stored cart data:", e);
          // If parsing fails, use the initial state
          setCart(initialCartState);
        }
      }
    }
  }, []);

  // --- Persistence Logic (Save to localStorage on cart change) ---
  useEffect(() => {
    // Save to localStorage whenever the 'cart' state changes
    if (typeof window !== "undefined") {
      localStorage.setItem("eventify_cart", JSON.stringify(cart));
    }
  }, [cart]);

  // --- Cart Actions ---

  /**
   * Adds an item to the cart. If the item already exists, updates its quantity.
   * @param {object} item - The item object (must have an 'id').
   * @param {number} quantity - The quantity to add.
   */
  const addItem = (item, quantity = 1) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.items.findIndex(
        (i) => i.id === item.id
      );

      let newItems;

      if (existingItemIndex > -1) {
        // Item exists, update quantity
        newItems = prevCart.items.map((i, index) =>
          index === existingItemIndex
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        // New item, add to cart
        newItems = [...prevCart.items, { ...item, quantity }];
      }

      return { ...prevCart, items: newItems };
    });
  };


  const removeItem = (itemId) => {
    setCart((prevCart) => ({
      ...prevCart,
      items: prevCart.items.filter((item) => item.id !== itemId),
    }));
  };


  const clearCart = () => {
    setCart(initialCartState);
  };

  // Memoize computed values for performance
  const itemCount = useMemo(() => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }, [cart.items]);

  const contextValue = {
    ...cart,
    itemCount,
    addItem,
    removeItem,
    clearCart,
  };

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};
