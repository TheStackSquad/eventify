//frontwend/src/app/layout.js

import { Plus_Jakarta_Sans, Onest } from "next/font/google";
import Header from "@/components/common/Header";
import { CartProvider } from "@/context/cartContext";
import "./globals.css";

// 1. Define the Header Font (Jakarta Sans - applied to H elements)
const headerFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta-sans", // CSS variable: var(--font-jakarta-sans)
});

// 2. Define the Body Font (Onest - applied to body, buttons, etc.)
const bodyFont = Onest({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-onest", // CSS variable: var(--font-onest)
});

export const metadata = {
  title: "Eventify | Discover Events, Buy Tickets, & Promote Your Show",
  description:
    "Eventify is the premier platform for event discovery, secure ticket purchasing, and seamless show promotion. List your event, sell tickets, and reach a global audience.",
};

export default function RootLayout({ children }) {
  return (
    // Apply both font variables to the root <html> tag
    <html lang="en" className={`${headerFont.variable} ${bodyFont.variable}`}>
      <body>
        {/* Wrap the entire content with the CartProvider */}
        <CartProvider>
          <Header />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
        </CartProvider>
      </body>
    </html>
  );
}
