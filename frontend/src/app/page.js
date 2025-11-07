// src/app/page.js
"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Hero from "@/components/homepage/hero";
import TicketCard from "@/components/homepage/ticketCard";
import { fetchAllEvents } from "@/redux/action/eventAction";

export default function Home() {
  // // 💡 STEP 3: Initialize dispatch
  const dispatch = useDispatch();

  // 💡 STEP 4: Dispatch the fetch action on mount
  useEffect(() => {
    if (fetchAllEvents) {
      dispatch(fetchAllEvents());
    }
  }, [dispatch]);

  return (
    <main className="min-h-screen bg-black">
      <Hero />
      <TicketCard />
    </main>
  );
}
