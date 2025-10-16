// frontend/src/components/dashboard/sidebar.js
"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  LogOut,
  UserPlus,
} from "lucide-react";

export default function Sidebar({
  activeView,
  onViewChange,
  onLogout,
  userName,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Use a different state for menu expansion, since there's no way to reliably
  // use `activeView` to determine if a menu should be expanded when collapsed.
  const [expandedMenus, setExpandedMenus] = useState({});

  const menuItems = [
    { id: "events", label: "My Events", icon: Calendar },
    {
      // --- FIX: Added unique ID for the toggle, and combined subItems ---
      id: "vendor-group", // Unique ID for the parent menu item/toggle
      label: "Vendor",
      // Note: Removed the parent 'icon' since it acts as a group/toggle
      subItems: [
        { id: "vendor", label: "Vendor Analytics", icon: Package },
        { id: "vendor-register", label: "Register", icon: UserPlus },
      ],
    },
  ];

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleMenuClick = (item) => {
    if (item.subItems) {
      // --- FIX: Only toggle, don't change view for parent items with subItems ---
      toggleMenu(item.id);
      // If collapsed, expand sidebar when clicking menu with subitems
      if (isCollapsed) {
        setIsCollapsed(false);
      }
    } else {
      onViewChange(item.id);
    }
  };

  // Helper function to check if a menu item or any of its subitems are active
  const isMenuActive = (item) => {
    if (activeView === item.id) return true;
    if (item.subItems) {
      return item.subItems.some((subItem) => activeView === subItem.id);
    }
    return false;
  };

  return (
    <div
      className={`
        bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20" : "w-64"}
        flex flex-col h-screen sticky top-0
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
            // Only assign an Icon if one exists, which ensures the Vendor group (without an icon)
            // doesn't break if you try to render an undefined component.
            const Icon = item.icon;
            const isActive = isMenuActive(item);
            const isExpanded = expandedMenus[item.id];
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <li key={item.id}>
                {/* Main Menu Item */}
                <button
                  onClick={() => handleMenuClick(item)}
                  // If it has subitems, we treat it as a pure toggle; otherwise, it's a regular navigation link.
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200
                    ${
                      // If it's a link (no subitems), highlight it if active.
                      // If it's a toggle (has subitems), highlight it if any subitem is active or if it's currently expanded.
                      isActive || (hasSubItems && isExpanded)
                        ? "bg-indigo-50 text-indigo-600 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  title={isCollapsed ? item.label : ""}
                >
                  {/* --- FIX: Only render icon if one is defined on the item --- */}
                  {Icon && (
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? "text-indigo-600" : "text-gray-500"
                      }`}
                    />
                  )}
                  {/* For menu items with no icon (like the Vendor group), ensure the collapsed view still works */}
                  {!Icon && isCollapsed && (
                    <span
                      className={`w-5 h-5 flex-shrink-0 text-gray-500 text-lg font-semibold`}
                    >
                      {item.label[0]}
                    </span>
                  )}

                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                      {/* Only show the chevron for menu items that have sub-items */}
                      {hasSubItems &&
                        (isExpanded ? (
                          <ChevronUp className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 flex-shrink-0" />
                        ))}
                    </>
                  )}
                </button>

                {/* Submenu Items */}
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
                              className={`w-4 h-4 flex-shrink-0 ${
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
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-red-600 hover:bg-red-50 transition-colors
            ${isCollapsed ? "justify-center" : ""}
          `}
          title={isCollapsed ? "Logout" : ""}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
