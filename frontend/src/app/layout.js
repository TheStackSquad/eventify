// frontend/src/app/layout.js

import { Plus_Jakarta_Sans, Onest } from "next/font/google";
import Header from "@/components/common/Header";
import { CartProvider } from "@/context/cartContext";
import ToastProvider from "@/components/common/toast/toastProvider";
import ReduxProvider from "@/redux/reduxProvider";
import "./globals.css";

const headerFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta-sans",
});

const bodyFont = Onest({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-onest",
});

export const metadata = {
  title: "Eventify | Discover Events, Buy Tickets, & Promote Your Show",
  description:
    "Eventify is the premier platform for event discovery, secure ticket purchasing, and seamless show promotion. List your event, sell tickets, and reach a global audience.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${headerFont.variable} ${bodyFont.variable}`}>
      <body>
        <ReduxProvider>
          <CartProvider>
            <Header />
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
            <ToastProvider />
          </CartProvider>
        </ReduxProvider>{" "}
      </body>
    </html>
  );
}
