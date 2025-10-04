// src/data/upcomingEvents.js

// Updated dummy data with ticket categories
export const dummyEvents = [
  {
    id: 1,
    title: "Lagos Tech Summit 2025: The Future of AI",
    date: "Sat, Oct 12",
    time: "9:00 AM",
    location: "Lagos",
    tickets: [
      { type: "Regular", price: 9000, available: true, quantity: 150 },
      { type: "VIP", price: 15000, available: true, quantity: 50 },
      { type: "VVIP", price: 25000, available: true, quantity: 20 }
    ],
    category: "Conference",
    image: "https://placehold.co/600x400/805ad5/ffffff?text=Tech+Summit",
    tag: "Trending",
  },
  {
    id: 2,
    title: "Ibadan Food & Wine Festival",
    date: "Sun, Oct 20",
    time: "3:00 PM",
    location: "Ibadan",
    tickets: [
      { type: "General Admission", price: 0, available: true, quantity: 500 },
      { type: "VIP Tasting Pass", price: 4500, available: true, quantity: 100 }
    ],
    category: "Festival",
    image: "https://placehold.co/600x400/f6ad55/1a202c?text=Food+Fest",
    tag: "Free Ticket",
  },
  {
    id: 3,
    title: "Jazz Night at The Blue Note, Port Harcourt",
    date: "Fri, Oct 25",
    time: "8:30 PM",
    location: "Port Harcourt",
    tickets: [
      { type: "Regular", price: 2500, available: true, quantity: 5 },
      { type: "VIP", price: 5000, available: false, quantity: 0 }
    ],
    category: "Concert",
    image: "https://placehold.co/600x400/e3a5a5/1a202c?text=Jazz+Concert",
    tag: "Almost Sold Out",
  },
  {
    id: 4,
    title: "Lagos City Marathon 10K Run",
    date: "Sun, Nov 3",
    time: "6:00 AM",
    location: "Lagos",
    tickets: [
      { type: "Early Bird", price: 5000, available: false, quantity: 0 },
      { type: "Regular", price: 7500, available: true, quantity: 200 },
      { type: "Late Registration", price: 10000, available: true, quantity: 50 }
    ],
    category: "Sport",
    image: "https://placehold.co/600x400/38bdf8/1a202c?text=Marathon",
    tag: "New",
  },
  {
    id: 5,
    title: "Ogun State Art Exhibition",
    date: "Sat, Nov 9",
    time: "11:00 AM",
    location: "Ogun",
    tickets: [
      { type: "Free Entry", price: 0, available: true, quantity: 1000 }
    ],
    category: "Arts",
    image: "https://placehold.co/600x400/94a3b8/ffffff?text=Art+Show",
    tag: "Free Ticket",
  },
  {
    id: 6,
    title: "Benin Comedy Extravaganza",
    date: "Sun, Nov 17",
    time: "7:00 PM",
    location: "Benin",
    tickets: [
      { type: "Regular", price: 3000, available: true, quantity: 300 },
      { type: "VIP", price: 6000, available: true, quantity: 80 },
      { type: "Table for 4", price: 20000, available: true, quantity: 15 }
    ],
    category: "Comedy",
    image: "https://placehold.co/600x400/60a5fa/1a202c?text=Comedy+Show",
    tag: "Trending",
  },
];

export const allCategories = [
  "All",
  "Conference",
  "Festival",
  "Concert",
  "Sport",
  "Arts",
  "Comedy",
];
