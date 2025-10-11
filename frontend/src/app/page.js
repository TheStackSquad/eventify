// src/app/page.js
"use client"; // 💡 STEP 1: Convert to Client Component

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Hero from "@/components/homepage/hero";
import TicketCard from "@/components/homepage/ticketCard";
import { fetchUserEvents } from "@/redux/action/eventAction";

export default function Home() {
  // 💡 STEP 3: Initialize dispatch
  const dispatch = useDispatch();

  // 💡 STEP 4: Dispatch the fetch action on mount
  useEffect(() => {
    if (fetchUserEvents) {
      dispatch(fetchUserEvents());
    }
  }, [dispatch]);

  return (
    <main className="min-h-screen bg-black">
      <Hero />
      <TicketCard />
    </main>
  );
}
