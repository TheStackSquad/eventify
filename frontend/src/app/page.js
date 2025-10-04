// src/app/page.js
import Hero from "@/components/homepage/hero";
import TicketCard from "@/components/homepage/ticketCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Hero />
      <TicketCard />
    </main>
  );
}
