const customerOrigin =
  process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN ?? "http://127.0.0.1:3000";
const operationsOrigin =
  process.env.NEXT_PUBLIC_STAFF_ORIGIN ?? "http://localhost:3000";

function portalUrl(origin: string, path = "/") {
  return new URL(path, origin).toString();
}

/**
 * Customer pages must stay on the host the customer is already using.
 *
 * The customer deployment is reachable through both the apex domain and
 * `www`. Absolute links built from NEXT_PUBLIC_CUSTOMER_ORIGIN could move a
 * signed-in customer between those hosts, where a host-only session cookie is
 * invisible. Relative links keep the session and the `next` return path on
 * the same host. Operations links remain absolute because they intentionally
 * live on a separate portal host.
 */
export function customerUrl(path = "/") {
  return path.startsWith("/") ? path : `/${path}`;
}

export function adminUrl(path = "/admin/login") {
  return portalUrl(operationsOrigin, path);
}

export function riderUrl(path = "/rider/login") {
  return portalUrl(operationsOrigin, path);
}

export const portalOrigins = { customer: customerOrigin, operations: operationsOrigin };
