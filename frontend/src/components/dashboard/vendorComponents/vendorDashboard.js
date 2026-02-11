//frontend/src/components/dashboard/vendorComponents/vendorsDashboard.js
"use client";

import React from "react";
import LoadingSpinner from "@/components/common/loading/loadingSpinner";
import VendorRegistrationView from "@/components/vendorUI/components/form/vendorRegistrationView";
import VendorAnalyticsDashboard from "./vendorAnalytics/vendorAnalyticsDashboard";

export default function VendorManagementView({ activeView, user }) {
  console.log("🏪 [VendorDashboard] Rendering", {
    activeView,
    userId: user?.id,
    vendorId: user?.vendorId, // ✅ Log both IDs for debugging
    isVendor: user?.isVendor,
  });

  // ✅ Guard: Wait for user data
  if (!user?.id) {
    return (
      <LoadingSpinner
        message="Loading vendor dashboard..."
        subMessage="Fetching your business data"
        size="md"
        color="indigo"
        fullScreen={false}
        className="bg-white rounded-xl shadow-sm border border-gray-100"
      />
    );
  }

  // ✅ View Routing
  switch (activeView) {
    case "vendor":
      // ✅ FIXED: Check if user has vendor profile
      if (!user.vendorId) {
        console.warn(
          "⚠️ [VendorDashboard] User is marked as vendor but has no vendorId",
        );
        // Redirect to registration or show empty state
        return (
          <VendorRegistrationView
            userId={user.id}
            initialData={{
              email: user.email,
              fullName: user.name,
            }}
          />
        );
      }

      // ✅ FIXED: Pass vendorId instead of userId
      return (
        <VendorAnalyticsDashboard
          vendorId={user.vendorId} // ✅ Use vendorId
          userId={user.id} // ✅ Keep userId for context
          userEmail={user.email}
        />
      );

    case "vendor-register":
      return (
        <VendorRegistrationView
          userId={user.id}
          initialData={{
            email: user.email,
            fullName: user.name,
          }}
        />
      );

    default:
      console.warn("⚠️ [VendorDashboard] Unknown view:", activeView);

      // ✅ FIXED: Use vendorId in default case too
      if (user.vendorId) {
        return (
          <VendorAnalyticsDashboard
            vendorId={user.vendorId}
            userId={user.id}
            userEmail={user.email}
          />
        );
      }

      // No vendor profile, show registration
      return (
        <VendorRegistrationView
          userId={user.id}
          initialData={{
            email: user.email,
            fullName: user.name,
          }}
        />
      );
  }
}
