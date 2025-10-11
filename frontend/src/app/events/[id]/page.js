// src/app/events/[id]/page.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useCart } from "@/context/cartContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux"; // 💡 Use useSelector for Redux State
import Image from "next/image";
import { ArrowLeft, ShoppingCart, CheckCircle } from "lucide-react";

const EventDetailPage = ({ params = {} }) => {
  const router = useRouter();
  const { addItem } = useCart(); // Destructure addItem from cart context
  const eventId = params.id;

  // 1. DATA SELECTION from Redux State
  // Assuming 'events' is the key in your root reducer and 'userEvents' holds the array
  const allEvents = useSelector((state) => state.events?.userEvents || []);

  // Find the specific event based on the slug ID
  const event = useMemo(() => {
    return allEvents.find((e) => e.id === eventId);
  }, [allEvents, eventId]);

  // 2. TICKET SELECTION STATE
  // Initialize state based on the first available ticket tier
  const [selectedTierId, setSelectedTierId] = useState(
    event?.tickets[0]?.tierName || null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false); // State for Add to Cart feedback

  // Find the currently selected ticket object
  const selectedTier = useMemo(() => {
    return event?.tickets.find((t) => t.tierName === selectedTierId);
  }, [event, selectedTierId]);

  // Sync initial tier selection when event data loads
  useEffect(() => {
    if (event && !selectedTierId) {
      setSelectedTierId(event.tickets[0]?.tierName || null);
    }
  }, [event, selectedTierId]);

  // 3. HANDLERS
  const handleAddToCart = () => {
    if (!selectedTier || quantity < 1 || !event) return;

    // Prepare item structure for the Cart Context (must match tierId/eventId logic)
    const itemToAdd = {
      eventId: event.id,
      tierId: selectedTier.tierName, // Unique identifier for the tier
      eventTitle: event.eventTitle,
      tierName: selectedTier.tierName,
      price: selectedTier.price,
      eventImage: event.eventImage, // Required for cart display
      maxQuantity: selectedTier.quantity, // Max tickets available
    };

    addItem(itemToAdd, quantity);

    // Provide user feedback
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000); // Reset feedback state
  };

  const handleCheckoutNow = () => {
    // 1. Add item to cart
    handleAddToCart();
    // 2. Redirect to the cart page immediately
    router.push("/cart");
  };

  // --- Rendering States ---
  if (!event) {
    // NOTE: In production, you would check for a 'loading' status here too.
    return (
      <div className="p-10 text-center text-gray-500">
        Event Not Found or Loading...
      </div>
    );
  }

  const isSoldOut = selectedTier && selectedTier.quantity < 1;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* 1. TOP NAVIGATION / BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-gray-600 hover:text-red-600 transition-colors font-medium"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Events
      </button>

      {/* EVENT HEADER AND IMAGE */}
      <div className="flex flex-col lg:flex-row gap-8 mb-10 bg-white shadow-xl rounded-2xl overflow-hidden p-4 md:p-6">
        <div className="relative w-full lg:w-1/2 h-64 md:h-96 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={event.eventImage}
            alt={event.eventTitle}
            fill
            className="object-cover"
          />
        </div>
        <div className="lg:w-1/2 space-y-4">
          <h1 className="text-4xl font-extrabold text-gray-900">
            {event.eventTitle}
          </h1>
          <p className="text-lg text-gray-600">{event.eventDescription}</p>
          <div className="border-t pt-4 space-y-2">
            <p className="font-semibold text-gray-700">
              Date:{" "}
              <span className="font-normal">
                {new Date(event.startDate).toLocaleDateString()}
              </span>
            </p>
            <p className="font-semibold text-gray-700">
              Location:{" "}
              <span className="font-normal">
                {event.venueName}, {event.city}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* TICKET SELECTION AND CTA SECTION */}
      <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-inner">
        <h2 className="text-2xl font-black text-gray-800 mb-6">
          Purchase Tickets
        </h2>

        {/* TICKET TIER SELECTION */}
        <div className="mb-6 space-y-4">
          <label
            htmlFor="ticket-tier"
            className="block text-lg font-semibold text-gray-700"
          >
            Select Ticket Tier:
          </label>
          <select
            id="ticket-tier"
            value={selectedTierId}
            onChange={(e) => setSelectedTierId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition duration-150"
          >
            {event.tickets.map((tier) => (
              <option key={tier.tierName} value={tier.tierName}>
                {tier.tierName} - ₦{tier.price.toLocaleString()}
                {tier.quantity < 50 &&
                  tier.quantity > 0 &&
                  ` (Only ${tier.quantity} left!)`}
                {tier.quantity === 0 && ` (SOLD OUT)`}
              </option>
            ))}
          </select>
        </div>

        {/* QUANTITY AND PRICE DISPLAY */}
        {selectedTier && (
          <div className="flex items-center justify-between p-4 bg-white border border-dashed border-gray-300 rounded-lg mb-6">
            <div className="flex items-center space-x-4">
              <label
                htmlFor="quantity"
                className="text-base font-semibold text-gray-700"
              >
                Quantity:
              </label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(
                      1,
                      Math.min(
                        parseInt(e.target.value) || 1,
                        selectedTier.quantity
                      )
                    )
                  )
                } // Clamp quantity
                min="1"
                max={selectedTier.quantity}
                disabled={isSoldOut}
                className="border border-gray-300 p-2 w-20 text-center rounded-lg focus:border-blue-500"
              />
            </div>
            <p className="text-xl font-bold text-red-600">
              Total: ₦{(selectedTier.price * quantity).toLocaleString()}
            </p>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
          {/* 2. ADD TO CART BUTTON (User can continue browsing) */}
          <button
            onClick={handleAddToCart}
            disabled={isSoldOut || isAdded}
            className={`flex-1 w-full flex items-center justify-center py-3 px-4 font-semibold rounded-xl transition-all duration-300 transform active:scale-95 ${
              isSoldOut
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : isAdded
                ? "bg-green-500 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isAdded ? (
              <>
                <CheckCircle size={20} className="mr-2" /> Added!
              </>
            ) : (
              <>
                <ShoppingCart size={20} className="mr-2" /> Add to Cart & Keep
                Browsing
              </>
            )}
          </button>

          {/* 3. CHECKOUT BUTTON (User wants to checkout immediately) */}
          <button
            onClick={handleCheckoutNow}
            disabled={isSoldOut}
            className={`flex-1 w-full flex items-center justify-center py-3 px-4 font-semibold rounded-xl transition-all duration-300 transform active:scale-95 ${
              isSoldOut
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            Buy Now & Checkout
          </button>
        </div>
      </div>

      {/* 4. CONTINUE BROWSING CTA */}
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          <span className="mr-2">←</span> See All Upcoming Events
        </Link>
      </div>
    </div>
  );
};

export default EventDetailPage;
