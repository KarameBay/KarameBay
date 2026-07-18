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
import "./support-reviews.css";
import "./parcel.css";
import "./responsive-header.css";
import { AppProviders } from "@/components/app-providers";

const siteUrl = "https://www.karamebay.com";
const businessPhone = "+250789950707";
const logoUrl = `${siteUrl}/images/karame-transport-logo.jpeg`;
const shareImageUrl = `${siteUrl}/images/karame-campaign-service.jpeg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Karame Bay ? Kigali Delivered",
    template: "%s | Karame Bay",
  },
  description:
    "Order food, groceries, market items, and parcel delivery across Kigali with Karame Bay.",
  applicationName: "Karame Bay",
  keywords: [
    "Karame Bay",
    "Kigali delivery",
    "Rwanda delivery",
    "food delivery Kigali",
    "grocery delivery Kigali",
    "parcel delivery Kigali",
  ],
  authors: [{ name: "Karame Bay" }],
  creator: "Karame Bay",
  publisher: "Karame Bay",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_RW",
    url: siteUrl,
    siteName: "Karame Bay",
    title: "Karame Bay ? Kigali Delivered",
    description:
      "Order food, groceries, market items, and parcel delivery across Kigali with Karame Bay.",
    images: [
      {
        url: shareImageUrl,
        width: 900,
        height: 1136,
        alt: "Karame Bay transport and delivery in Kigali",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Karame Bay ? Kigali Delivered",
    description:
      "Order food, groceries, market items, and parcel delivery across Kigali with Karame Bay.",
    images: [shareImageUrl],
  },
  category: "delivery",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

const fontVariables = {
  "--font-body": "Arial, Helvetica, sans-serif",
  "--font-display": "Arial, Helvetica, sans-serif",
} as CSSProperties & Record<string, string>;

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Karame Bay",
  url: siteUrl,
  logo: logoUrl,
  email: "info@karamebay.com",
  telephone: businessPhone,
  sameAs: ["https://www.instagram.com/karame_transport_delivery"],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Karame Bay",
  image: shareImageUrl,
  url: siteUrl,
  telephone: businessPhone,
  email: "info@karamebay.com",
  priceRange: "RWF",
  description:
    "Karame Bay provides food, grocery, market, and parcel delivery services across Kigali.",
  areaServed: {
    "@type": "City",
    name: "Kigali",
    addressCountry: "RW",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kigali",
    addressCountry: "RW",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body style={fontVariables}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, localBusinessSchema]),
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
