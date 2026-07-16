const customerOrigin =
  process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN ?? "http://127.0.0.1:3000";
const operationsOrigin =
  process.env.NEXT_PUBLIC_STAFF_ORIGIN ?? "http://localhost:3000";

function portalUrl(origin: string, path = "/") {
  return new URL(path, origin).toString();
}

export function customerUrl(path = "/") {
  return portalUrl(customerOrigin, path);
}

export function adminUrl(path = "/admin/login") {
  return portalUrl(operationsOrigin, path);
}

export function riderUrl(path = "/rider/login") {
  return portalUrl(operationsOrigin, path);
}

export const portalOrigins = { customer: customerOrigin, operations: operationsOrigin };
