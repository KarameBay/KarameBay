import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import "./auth-reset.css";
import "./catalog.css";
import "./cart.css";
import "leaflet/dist/leaflet.css";
import "./delivery.css";
import "./location-search.css";
import "./checkout.css";
import "./step6.css";
import "./step6-overrides.css";
import "./address-book.css";
import "./rider.css";
import "./portal.css";
import "./home.css";
import "./info-pages.css";
import "./notifications.css";
import "./admin-settings.css";
import "./parcel.css";
import "./responsive-header.css";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "Karame Bay — Kigali delivered",
  description:
    "Restaurants, markets and everyday essentials delivered across Kigali.",
  icons: {
    icon: "/images/karame-transport-logo.jpeg",
    apple: "/images/karame-transport-logo.jpeg",
  },
};

const fontVariables = {
  "--font-body": "Arial, Helvetica, sans-serif",
  "--font-display": "Arial, Helvetica, sans-serif",
} as CSSProperties & Record<string, string>;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body style={fontVariables}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
