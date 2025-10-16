// frontend/src/components/dashboard/DashboardLayout.js
"use client";

import Sidebar from "./sidebar";

export default function DashboardLayout({
  userName,
  activeView,
  onViewChange,
  onLogout,
  children,
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={onViewChange}
        onLogout={onLogout}
        userName={userName}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
