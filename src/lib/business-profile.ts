import { cache } from "react";
import { db } from "@/lib/db";

export const SYSTEM_BUSINESS_DEFAULTS = {
  id: "business",
  businessName: "Karame Bay",
  supportEmail: "karamebay3@gmail.com",
  supportPhone: "+250789950707",
  whatsappNumber: "+250789950707",
  businessAddress: "Gikondo, Kigali, Rwanda",
  businessHours: "Open daily, 24 hours",
  instagramUrl:
    "https://www.instagram.com/karame_transport_delivery?igsh=bHh4Mjdya2M2c2lp",
} as const;

export const getBusinessProfile = cache(async () => {
  const profile = await db.businessProfile.findUnique({
    where: { id: SYSTEM_BUSINESS_DEFAULTS.id },
  });
  return profile ?? { ...SYSTEM_BUSINESS_DEFAULTS, updatedAt: new Date(0) };
});
