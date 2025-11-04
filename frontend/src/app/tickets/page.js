// frontend/src/app/ticket/page.js

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Ticket, CheckCircle } from "lucide-react";
import axios, { ENDPOINTS } from "@/axiosConfig/axios";
import Link from "next/link";

// Import the refactored modules
import TicketCard from "@/components/ticketUI/ticketCard";
import TicketActions from "@/components/ticketUI/ticketAction";
import {
  formatCurrency,
  saveTicketDataLocally,
  downloadTicket,
  shareTicket,
} from "@/components/ticketUI/ticketUtils";

export default function TicketPage() {
  const searchParams = useSearchParams();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedLocally, setSavedLocally] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });

  const reference = searchParams.get("ref") || searchParams.get("reference");

  const checkLocalStorage = (ref) => {
    if (ref) {
      const saved = localStorage.getItem(`ticket_${ref}`);
      setSavedLocally(!!saved);
    }
  };

  /**
   * Fetches ticket data from the API. Wrapped in useCallback to satisfy linting.
   */
  const fetchTicketData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${ENDPOINTS.PAYMENTS.VERIFY}/${reference}`
      );

      if (response.data.status === "success" && response.data.data) {
        setOrderData(response.data.data);
      } else {
        setNotification({
          message: "Error: Ticket verification failed.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching ticket data:", error);
      setNotification({
        message: "Could not connect to ticket service.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [reference, setOrderData, setLoading, setNotification]);

  // --- Effects ---
  // Linting fixed by including fetchTicketData as a dependency.
  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }
    fetchTicketData();
    checkLocalStorage(reference);
  }, [reference, fetchTicketData]); // <- fetchTicketData is now included here

  // --- HANDLERS using imported utility functions ---

  const handleSave = () => {
    if (!orderData) return;
    const success = saveTicketDataLocally(reference, orderData);

    if (success) {
      setSavedLocally(true);
      setNotification({
        message: "✅ Ticket saved to your device for offline use!",
        type: "success",
      });
    } else {
      setNotification({
        message: "❌ Failed to save ticket locally.",
        type: "error",
      });
    }
    setTimeout(() => setNotification({ message: "", type: "" }), 4000); // Clear notification
  };

  const handleDownload = () => {
    if (!orderData) return;
    const success = downloadTicket(orderData);
    if (success) {
      setNotification({
        message: "📥 Ticket download started!",
        type: "success",
      });
    } else {
      setNotification({ message: "❌ Download failed.", type: "error" });
    }
    setTimeout(() => setNotification({ message: "", type: "" }), 4000); // Clear notification
  };

  const handleShare = async () => {
    if (!orderData) return;
    const result = await shareTicket(orderData);

    if (result === "copied") {
      setNotification({
        message: "🔗 Link copied to clipboard!",
        type: "success",
      });
    } else if (result === true) {
      // Native share successful (no notification needed as OS handles it)
    } else {
      setNotification({
        message: "❌ Share failed. Try copying the URL manually.",
        type: "error",
      });
    }
    setTimeout(() => setNotification({ message: "", type: "" }), 4000); // Clear notification
  };

  // Custom Notification Toast
  const NotificationToast = () => (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl transition-transform duration-500 ease-out transform ${
        notification.message
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      } ${
        notification.type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {notification.message}
    </div>
  );

  // --- Conditional Renders ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your ticket...</p>
        </div>
      </div>
    );
  }

  if (!reference || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Ticket className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Ticket Found
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find the ticket you&apos;re looking for. Please check the
            reference.
          </p>
          <Link
            href="/"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  // --- Main Render ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 py-12 px-4">
      <NotificationToast />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4 transition-all duration-500">
            <CheckCircle size={20} />
            <span className="font-medium">Ticket Confirmed</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your Ticket is Ready! 🎉
          </h1>
          <p className="text-gray-600">
            Present this at the venue entrance or download for offline access
          </p>
        </div>

        {/* 1. Display Component */}
        <TicketCard orderData={orderData} formatCurrency={formatCurrency} />

        {/* 2. Action Component */}
        <TicketActions
          savedLocally={savedLocally}
          onDownload={handleDownload}
          onSave={handleSave}
          onShare={handleShare}
        />
      </div>
    </div>
  );
}
