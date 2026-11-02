import { randomUUID } from "node:crypto";

const base = process.env.TEST_BASE_URL;
const password = process.env.TEST_ACCOUNT_PASSWORD;
if (!base?.includes("staging.up.railway.app") || !password)
  throw new Error("This test requires the isolated Railway staging URL and password.");

async function request(path: string, cookie = "", method = "GET", body?: object) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data.error ?? ""}`);
  return { response, data };
}

async function login(role: "customer" | "admin" | "partner" | "rider") {
  const audience = role === "customer" ? "customer" : role === "partner" ? "partner" : "staff";
  const { response, data } = await request("/api/auth/login", "", "POST", {
    email: `${role}@karamebay.rw`, password, audience, portal: role,
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`${role} session cookie missing`);
  return { cookie, id: data.user.id as string };
}

async function main() {
  const customer = await login("customer");
  const admin = await login("admin");
  const partner = await login("partner");
  const rider = await login("rider");
  const storeSuggestions = (await request("/api/catalog/suggestions?q=Java%20House")).data.suggestions as { id: string; kind: string; label: string }[];
  const store = storeSuggestions.find((item) => item.kind === "store" && item.label === "Java House Kigali Heights");
  if (!store) throw new Error("Staging restaurant not found");
  const productSuggestions = (await request("/api/catalog/suggestions?q=House%20Coffee&store=java-house-kigali-heights")).data.suggestions as { id: string; kind: string; label: string }[];
  const product = productSuggestions.find((item) => item.kind === "product" && item.label === "House Coffee");
  if (!product) throw new Error("Staging coffee product not found");
  const destination = { latitude: -1.9706, longitude: 30.1044 };
  const route = (await request(`/api/routing?storeId=${store.id}&customerLat=${destination.latitude}&customerLng=${destination.longitude}`)).data;
  const payload = {
    checkoutRequestId: randomUUID(),
    items: [{ productId: product.id, catalogEngine: "RESTAURANT", quantity: 1, priceRwf: 2500 }],
    deliveryLatitude: destination.latitude,
    deliveryLongitude: destination.longitude,
    deliveryAddress: "Staging workflow test, Kigali Heights, Kigali",
    expectedItemsSubtotalRwf: 2500,
    expectedDeliveryFeeRwf: route.deliveryFeeRwf,
    paymentConfirmed: true,
    ebmRequested: true,
    ebmUsePhone: true,
    ebmPhone: "+250788000002",
  };
  const created = (await request("/api/orders", customer.cookie, "POST", payload)).data.order;
  if (!created?.id || !created.ebmRequested) throw new Error("Checkout did not preserve the EBM request");
  const replay = (await request("/api/orders", customer.cookie, "POST", payload)).data;
  if (!replay.replayed || replay.order.id !== created.id) throw new Error("Checkout replay created a duplicate order");
  const partnerOrders = (await request("/api/partner/orders", partner.cookie)).data.orders as { id: string }[];
  if (!partnerOrders.some((order) => order.id === created.id)) throw new Error("Partner cannot see the new order");
  await request(`/api/admin/orders/${created.id}`, admin.cookie, "PATCH", { action: "VERIFY_PAYMENT" });
  for (const status of ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"]) {
    await request("/api/partner/orders", partner.cookie, "PATCH", { orderId: created.id, status });
  }
  await request(`/api/admin/orders/${created.id}`, admin.cookie, "PATCH", { action: "ASSIGN_RIDER", riderId: rider.id });
  await request(`/api/rider/deliveries/${created.id}`, rider.cookie, "PATCH", { action: "ACCEPT" });
  for (const status of ["PICKED_UP", "ON_THE_WAY", "DELIVERED"]) {
    await request(`/api/rider/deliveries/${created.id}`, rider.cookie, "PATCH", { action: "UPDATE_STATUS", status });
  }
  const orders = (await request("/api/orders", customer.cookie)).data.orders as { id: string; status: string }[];
  if (!orders.some((order) => order.id === created.id && order.status === "DELIVERED"))
    throw new Error("Customer cannot see the delivered order");
  console.log(JSON.stringify({ result: "PASS", orderNumber: created.orderNumber, ebmRequested: true, status: "DELIVERED", roles: 4 }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
