// // src/components/dashboard/containers/MyEventsContainer.js
// "use client";

// import React, { useState, useEffect, useMemo, useCallback } from "react";
// // Assuming Redux setup for state management
// import { useDispatch, useSelector } from "react-redux";
// import { AlertTriangle, BarChart3, XCircle } from "lucide-react";

// // FIX: Corrected import path for DashboardUI (sibling component)
// import DashboardUI from "@/components/dashboard/dashboardUI";

// // FIX: Corrected import path for configuration data (now using relative path since alias failed)
// import {
//   getEventsStatConfig,
//   getVendorsStatConfig,
//   eventsQuickActions,
//   vendorsQuickActions,
//   vendorMockStats,
// } from "../../data/dashboardConfig"; // Assuming path is: src/components/data/dashboardConfig.js

// // Mock Imports for Redux Actions/Selectors (Replace with actual paths)
// // import { fetchUserEvents } from "@/redux/actions/eventActions";

// // --- MOCK REDUX HOOKS AND DATA ---
// // We use a mock function to simulate the Redux store state for 'events'
// const mockEvents = [
//   {
//     id: "e1",
//     title: "Tech Expo 2024",
//     startDate: "2025-10-20T10:00:00Z",
//     endDate: "2025-10-22T18:00:00Z",
//     tickets: [
//       { price: 5000, quantity: 100 },
//       { price: 10000, quantity: 50 },
//     ],
//   },
//   {
//     id: "e2",
//     title: "Future of Music",
//     startDate: "2024-10-15T19:00:00Z",
//     endDate: "2024-10-16T01:00:00Z",
//     tickets: [{ price: 2000, quantity: 200 }],
//   },
//   {
//     id: "e3",
//     title: "Legacy Conference",
//     startDate: "2025-11-01T08:00:00Z",
//     endDate: "2025-11-03T17:00:00Z",
//     tickets: [{ price: 15000, quantity: 75 }],
//   },
//   {
//     id: "e4",
//     title: "Q3 Product Launch",
//     startDate: "2024-08-01T09:00:00Z",
//     endDate: "2024-08-01T12:00:00Z",
//     tickets: [{ price: 0, quantity: 500 }],
//   }, // Past event
// ];

// const mockUseSelector = (selector) => {
//   if (selector.toString().includes("events")) {
//     return {
//       items: mockEvents,
//       status: "succeeded",
//       error: null,
//       userName: "Alex Omolola", // Mock user data
//       purchasedTickets: [],
//     };
//   }
//   return {};
// };
// const mockUseDispatch = () => () => console.log("Mock Redux Action Dispatched");
// const fetchUserEvents = () => ({ type: "mock/fetchUserEvents" });
// // ---------------------------------

// export default function MyEventsContainer() {
//   // Use actual Redux hooks in a real application
//   const dispatch = mockUseDispatch(); // useDispatch();
//   const {
//     items: events,
//     status: eventsStatus,
//     userName,
//     purchasedTickets,
//   } = mockUseSelector((state) => state.events); // useSelector(state => state.events);

//   // --- State for Modals and View Toggle (Moved from page.js) ---
//   const [activeView, setActiveView] = useState("events"); // Master view state
//   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//   const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
//   const [selectedEvent, setSelectedEvent] = useState(null); // The event object to act upon

//   const isLoading = eventsStatus === "loading" || eventsStatus === "idle";

//   // --- Data Fetching (Moved from original page.js) ---
//   useEffect(() => {
//     // In a real app, this would check if data is needed/stale
//     // console.log("Fetching user events...");
//     dispatch(fetchUserEvents());
//   }, [dispatch]);

//   // --- Handlers (Moved from original page.js/DashboardUI.js) ---

//   const handleCreateEvent = useCallback(() => {
//     console.log("Navigating to event creation form...");
//     // router.push('/dashboard/create-event');
//   }, []);

//   const openDeleteModal = useCallback((event) => {
//     setSelectedEvent(event);
//     setIsDeleteModalOpen(true);
//   }, []);

//   const closeDeleteModal = useCallback(() => {
//     setSelectedEvent(null);
//     setIsDeleteModalOpen(false);
//   }, []);

//   const handleDeleteEvent = useCallback(() => {
//     if (selectedEvent) {
//       console.log(
//         `Deleting event: ${selectedEvent.id} (${selectedEvent.title})`
//       );
//       // dispatch(deleteEvent(selectedEvent.id));
//       closeDeleteModal();
//     }
//   }, [selectedEvent, closeDeleteModal]);

//   const openAnalyticsModal = useCallback((event) => {
//     setSelectedEvent(event);
//     setIsAnalyticsModalOpen(true);
//   }, []);

//   const closeAnalyticsModal = useCallback(() => {
//     setSelectedEvent(null);
//     setIsAnalyticsModalOpen(false);
//   }, []);

//   const handleViewChange = useCallback((view) => {
//     setActiveView(view);
//   }, []);

//   const handleLogout = useCallback(() => {
//     console.log("Logging out user...");
//     // dispatch(logoutUser());
//     // router.push('/login');
//   }, []);

//   // --- COMPLEX DATA CALCULATIONS (Moved from DashboardUI.js and MyEvents.js) ---

//   // Use useMemo for performance optimization of expensive data calculations
//   const { eventsCalculatedData, filteredEvents } = useMemo(() => {
//     const now = new Date();

//     // 1. Filter Events by Status (Logic moved from MyEvents.js)
//     const upcomingEvents = events
//       .filter((e) => new Date(e.startDate) > now)
//       .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
//     const liveEvents = events
//       .filter((e) => new Date(e.startDate) <= now && new Date(e.endDate) >= now)
//       .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
//     const pastEvents = events
//       .filter((e) => new Date(e.endDate) < now)
//       .sort((a, b) => new Date(b.endDate) - new Date(a.endDate)); // Sort past events descending

//     // 2. Calculate Dashboard Stats (Logic moved from DashboardUI.js)
//     const totalEvents = events.length;
//     const totalTicketInventory = events.reduce(
//       (sum, e) => sum + (e.tickets?.reduce((s, t) => s + t.quantity, 0) || 0),
//       0
//     );
//     const totalTicketTiers = events.reduce(
//       (sum, e) => sum + (e.tickets?.length || 0),
//       0
//     );
//     const potentialRevenue = events.reduce((sum, e) => {
//       const eventRevenue =
//         e.tickets?.reduce((s, t) => s + t.price * t.quantity, 0) || 0;
//       return sum + eventRevenue;
//     }, 0);

//     return {
//       eventsCalculatedData: {
//         totalEvents,
//         upcomingEvents: upcomingEvents.length,
//         liveEvents: liveEvents.length,
//         pastEvents: pastEvents.length,
//         totalTicketInventory,
//         totalTicketTiers,
//         potentialRevenue,
//       },
//       filteredEvents: { liveEvents, upcomingEvents, pastEvents },
//     };
//   }, [events]);

//   // --- CONFIGURATION MAPPING (Using extracted data) ---

//   // Events View Configuration
//   const eventsStatsConfig = getEventsStatConfig(eventsCalculatedData);
//   const eventsActions = eventsQuickActions(handleCreateEvent);

//   // Vendors View Configuration (using mock data from config file)
//   const vendorsStatsConfig = getVendorsStatConfig(vendorMockStats);
//   const vendorsActions = vendorsQuickActions;

//   // Final Props for DashboardUI
//   const currentStats =
//     activeView === "events" ? eventsStatsConfig : vendorsStatsConfig;
//   const currentQuickActions =
//     activeView === "events" ? eventsActions : vendorsActions;

//   // Combine all event-related props for the MyEvents component (via DashboardUI)
//   // NOTE: eventListProps is not directly used here, but filteredEvents is passed down

//   // --- Modals (Defined within the Container, using its state/handlers) ---

//   const DeleteModal = () => (
//     <div
//       className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
//         isDeleteModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"
//       }`}
//     >
//       <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm m-4 transform transition-all duration-300 scale-100">
//         <div className="flex items-start justify-between border-b pb-3 mb-4">
//           <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
//             <AlertTriangle className="w-5 h-5" /> Confirm Deletion
//           </h3>
//           <button
//             onClick={closeDeleteModal}
//             className="text-gray-400 hover:text-gray-600 transition-colors"
//           >
//             <XCircle className="w-6 h-6" />
//           </button>
//         </div>
//         <p className="text-gray-700 mb-6">
//           Are you sure you want to delete the event:{" "}
//           <span className="font-semibold">{selectedEvent?.title}</span>? This
//           action cannot be undone.
//         </p>
//         <div className="flex justify-end gap-3">
//           <button
//             onClick={closeDeleteModal}
//             className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleDeleteEvent}
//             className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
//           >
//             Delete Permanently
//           </button>
//         </div>
//       </div>
//     </div>
//   );

//   const AnalyticsModal = () => (
//     <div
//       className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
//         isAnalyticsModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"
//       }`}
//     >
//       <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl m-4 transform transition-all duration-300 scale-100">
//         <div className="flex items-start justify-between border-b pb-3 mb-6">
//           <h3 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
//             <BarChart3 className="w-6 h-6" /> Analytics for:{" "}
//             {selectedEvent?.title}
//           </h3>
//           <button
//             onClick={closeAnalyticsModal}
//             className="text-gray-400 hover:text-gray-600 transition-colors"
//           >
//             <XCircle className="w-6 h-6" />
//           </button>
//         </div>
//         <div className="min-h-48 text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
//           <p className="text-gray-600">
//             Analytics dashboard content for event{" "}
//             <span className="font-mono text-sm text-indigo-500">
//               {selectedEvent?.id}
//             </span>{" "}
//             will load here.
//           </p>
//           <p className="text-sm mt-2 text-gray-400">
//             (e.g., Ticket Sales Chart, Attendance Rate, Revenue Overview)
//           </p>
//         </div>
//         <div className="flex justify-end mt-6">
//           <button
//             onClick={closeAnalyticsModal}
//             className="px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <>
//       <DashboardUI
//         // High-level props
//         userName={userName}
//         isLoading={isLoading}
//         onLogout={handleLogout}
//         // View Toggle props
//         activeView={activeView}
//         onViewChange={handleViewChange}
//         // Data & Actions for the current view
//         events={events} // Keep raw events for vendors/UI logic if needed, but MyEvents will use filtered data
//         purchasedTickets={purchasedTickets}
//         stats={currentStats}
//         quickActions={currentQuickActions}
//         // Event specific handlers
//         onCreateEvent={handleCreateEvent}
//         openDeleteModal={openDeleteModal}
//         openAnalyticsModal={openAnalyticsModal}
//         // Pass filtered event data to DashboardUI so it can pass it to MyEvents
//         filteredEvents={filteredEvents}
//       />

//       {/* Modals are rendered here, controlled by the Container state */}
//       <DeleteModal />
//       <AnalyticsModal />
//     </>
//   );
// }
