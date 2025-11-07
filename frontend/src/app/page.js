// src/app/page.js
"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Hero from "@/components/homepage/hero";
import TicketCard from "@/components/homepage/ticketCard";
import { fetchAllEvents } from "@/redux/action/eventAction";

export default function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    // 1. Create the AbortController and its signal
    const controller = new AbortController();
    const signal = controller.signal;

    // 2. Dispatch the fetch action, passing the signal
    dispatch(fetchAllEvents(signal));

    // 3. Cleanup function: Abort the request when the component unmounts
    return () => {
      controller.abort();
    };
  }, [dispatch]); // Dependency array is clean

  return (
    <main className="min-h-screen bg-black">
      <Hero />
      <TicketCard />
    </main>
  );
}
