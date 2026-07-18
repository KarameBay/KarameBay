import { headers } from "next/headers";

function hostnameFromOrigin(origin: string | undefined) {
  if (!origin) return "";
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return origin.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  }
}

export async function isStaffPortalRequest() {
  const headerStore = await headers();
  const host = (headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "")
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();
  const configuredStaffHost = hostnameFromOrigin(process.env.NEXT_PUBLIC_STAFF_ORIGIN);

  return Boolean(
    host &&
      (host === configuredStaffHost ||
        host === "portal.karamebay.com" ||
        host.includes("staff-portal")),
  );
}
