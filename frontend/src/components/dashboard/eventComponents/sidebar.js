// frontend/src/components/dashboard/sidebar.

// frontend/src/components/dashboard/sidebar.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  LogOut,
  UserPlus,
  UserX,
  CreditCard,
} from "lucide-react";
import DeleteAccountModal from "@/components/modal/deleteAccountModal";
import { useAuth } from "@/utils/hooks/useAuth";

export default function Sidebar({
  activeView,
  onViewChange,
  onLogout,
  userName,
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalRendered, setIsModalRendered] = useState(false);

  // ================================================================
  // DYNAMIC MENU FILTERING
  // ================================================================
  const menuItems = useMemo(() => {
    const items = [];

    // Access for Creators (Constellar), existing Vendors, or Admins
    if (user?.hasEvents || user?.isVendor || user?.is_admin) {
      items.push({ id: "events", label: "My Events", icon: Calendar });
    }

    // "Loosened" Logic: Always show the Vendor group so users can register
    // We only gate the specific sub-items that require "active" vendor status
    const vendorSubItems = [
      { id: "vendor-register", label: "Register as Vendor", icon: UserPlus },
    ];

    // Only add Analytics to the sub-menu if they are already a vendor or admin
    if (user?.isVendor || user?.is_admin) {
      vendorSubItems.unshift({
        id: "vendor",
        label: "Vendor Analytics",
        icon: Package,
      });
    }

    items.push({
      id: "vendor-group",
      label: "Vendor Portal",
      subItems: vendorSubItems,
    });

    return items;
  }, [user]);

  // Manage modal portal rendering
  useEffect(() => {
    if (isDeleteModalOpen) {
      document.body.style.overflow = "hidden";
      setIsModalRendered(true);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDeleteModalOpen]);

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleMenuClick = (item) => {
    if (item.subItems) {
      toggleMenu(item.id);
      if (isCollapsed) setIsCollapsed(false);
    } else {
      onViewChange(item.id);
    }
  };

  const isMenuActive = (item) => {
    if (activeView === item.id) return true;
    if (item.subItems) {
      return item.subItems.some((subItem) => activeView === subItem.id);
    }
    return false;
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    console.log("Deleting account...");
    // await api.deleteAccount();
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    onLogout();
  };

  return (
    <>
      <div
        className={`
          bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
          flex flex-col h-screen sticky top-0 z-30
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500 truncate">{userName}</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isMenuActive(item);
              const isExpanded = expandedMenus[item.id];
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuClick(item)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-all duration-200
                      ${
                        isActive || (hasSubItems && isExpanded)
                          ? "bg-indigo-50 text-indigo-600 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }
                      ${isCollapsed ? "justify-center" : ""}
                    `}
                    title={isCollapsed ? item.label : ""}
                  >
                    {Icon && (
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? "text-indigo-600" : "text-gray-500"
                        }`}
                      />
                    )}
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">
                          {item.label}
                        </span>
                        {hasSubItems &&
                          (isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          ))}
                      </>
                    )}
                  </button>

                  {!isCollapsed && hasSubItems && isExpanded && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeView === subItem.id;
                        return (
                          <li key={subItem.id}>
                            <button
                              onClick={() => onViewChange(subItem.id)}
                              className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-lg
                                transition-all duration-200 text-sm
                                ${
                                  isSubActive
                                    ? "bg-indigo-50 text-indigo-600 font-medium"
                                    : "text-gray-600 hover:bg-gray-50"
                                }
                              `}
                            >
                              <SubIcon
                                className={`w-4 h-4 ${
                                  isSubActive
                                    ? "text-indigo-600"
                                    : "text-gray-400"
                                }`}
                              />
                              <span className="truncate">{subItem.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Action Buttons Container */}
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
            {/* Subscription Redirect */}
            <button
              onClick={() => router.push("/subscription")}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                bg-indigo-600 text-white font-medium
                transition-all duration-200 hover:bg-indigo-700 hover:shadow-md
                active:scale-95
                ${isCollapsed ? "justify-center" : ""}
              `}
              title={isCollapsed ? "Subscription" : ""}
            >
              <CreditCard className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Subscription</span>}
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-red-600 font-medium transition-all duration-200
                hover:bg-red-50 ${isCollapsed ? "justify-center" : ""}
              `}
              title={isCollapsed ? "Logout" : ""}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>

            {/* Delete Account */}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-gray-400 font-medium transition-all duration-200
                hover:text-red-600 ${isCollapsed ? "justify-center" : ""}
              `}
              title={isCollapsed ? "Delete Account" : ""}
            >
              <UserX className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-xs">Delete Account</span>}
            </button>
          </div>
        </nav>
      </div>

      {isModalRendered && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setTimeout(() => setIsModalRendered(false), 300);
          }}
          onConfirm={handleDeleteAccount}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}