import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PASSWORD_HASH_ROUNDS } from "../src/lib/auth/constants";

const db = new PrismaClient();
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const marker = `temporary-review-check-${Date.now()}`;
const password = randomBytes(24).toString("base64url");

async function login(email: string, portal: "customer" | "admin") {
  const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, audience: portal === "customer" ? "customer" : "staff", portal }) });
  if (!response.ok) throw new Error(`${portal} login failed: ${response.status}`);
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}

async function jsonRequest(path: string, cookie: string, method: string, body?: unknown) {
  return fetch(`${baseUrl}${path}`, { method, headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
}

async function main() {
  const originalBusiness = await db.businessProfile.findUniqueOrThrow({ where: { id: "business" } });
  const store = await db.store.findFirstOrThrow({ where: { status: "APPROVED" }, select: { id: true, slug: true } });
  const passwordHash = await hash(password, PASSWORD_HASH_ROUNDS);
  let customerId = ""; let adminId = ""; let riderId = ""; let reviewId = "";
  try {
    const [customer, admin, rider] = await Promise.all([
      db.user.create({ data: { email: `${marker}-customer@karamebay.invalid`, phone: `+250790${String(Date.now()).slice(-6)}`, firstName: "Review", lastName: "Customer", role: "CUSTOMER", status: "ACTIVE", passwordHash, emailVerifiedAt: new Date() } }),
      db.user.create({ data: { email: `${marker}-admin@karamebay.invalid`, phone: `+250791${String(Date.now()).slice(-6)}`, firstName: "Review", lastName: "Admin", role: "ADMIN", status: "ACTIVE", passwordHash } }),
      db.user.create({ data: { email: `${marker}-rider@karamebay.invalid`, phone: `+250792${String(Date.now()).slice(-6)}`, firstName: "Review", lastName: "Rider", role: "RIDER", status: "ACTIVE", passwordHash, riderProfile: { create: { riderStatus: "AVAILABLE" } } } }),
    ]);
    customerId = customer.id; adminId = admin.id; riderId = rider.id;
    const baseOrder = { customerId, riderId, storeId: store.id, itemsSubtotalRwf: 1000, deliveryFeeRwf: 500, grandTotalRwf: 1500, drivingDistanceM: 1000, estimatedDurationS: 600, deliveryLatitude: -1.95, deliveryLongitude: 30.06, deliveryAddress: marker };
    await db.order.create({ data: { ...baseOrder, orderNumber: `${marker}-pending`, status: "PENDING" } });
    await db.order.create({ data: { ...baseOrder, orderNumber: `${marker}-delivered`, status: "DELIVERED" } });
    const customerCookie = await login(customer.email, "customer");
    const pending = await jsonRequest("/api/reviews", customerCookie, "POST", { orderNumber: `${marker}-pending`, storeRating: 5 });
    if (pending.status !== 409) throw new Error("Undelivered order review was not blocked.");
    const created = await jsonRequest("/api/reviews", customerCookie, "POST", { orderNumber: `${marker}-delivered`, storeRating: 5, writtenReview: marker, riderOverallRating: 4, friendlinessRating: 5 });
    if (created.status !== 201) throw new Error(`Delivered review creation failed: ${created.status}`);
    reviewId = ((await created.json()) as { reviewId: string }).reviewId;
    const duplicate = await jsonRequest("/api/reviews", customerCookie, "POST", { orderNumber: `${marker}-delivered`, storeRating: 4 });
    if (duplicate.status !== 409) throw new Error("Duplicate order review was not blocked.");
    const edited = await jsonRequest(`/api/reviews/${reviewId}`, customerCookie, "PATCH", { storeRating: 4, writtenReview: `${marker}-edited`, riderOverallRating: 5 });
    if (!edited.ok) throw new Error("Review edit within 24 hours failed.");
    await db.review.update({ where: { id: reviewId }, data: { editableUntil: new Date(Date.now() - 1000) } });
    const expired = await jsonRequest(`/api/reviews/${reviewId}`, customerCookie, "PATCH", { storeRating: 3 });
    if (expired.status !== 409) throw new Error("Expired review edit was not blocked.");
    const adminCookie = await login(admin.email, "admin");
    const hidden = await jsonRequest(`/api/admin/reviews/${reviewId}`, adminCookie, "PATCH", { action: "HIDE", reason: "Automated verification" });
    if (!hidden.ok) throw new Error("Admin hide action failed.");
    const reply = await jsonRequest(`/api/admin/reviews/${reviewId}`, adminCookie, "PATCH", { action: "REPLY", reply: "Thank you for your feedback." });
    if (!reply.ok) throw new Error("Admin reply failed.");
    const shown = await jsonRequest(`/api/admin/reviews/${reviewId}`, adminCookie, "PATCH", { action: "SHOW" });
    if (!shown.ok) throw new Error("Admin show action failed.");
    const temporaryBusiness = `${marker} Business`;
    const businessUpdate = await jsonRequest("/api/admin/settings/business", adminCookie, "PUT", { businessName: temporaryBusiness, supportEmail: "support@karamebay.invalid", supportPhone: "0789950707", whatsappNumber: "0789950707", businessAddress: "Verification Address, Kigali", businessHours: "Verification hours", instagramUrl: "" });
    if (!businessUpdate.ok) throw new Error("Business profile update failed.");
    for (const path of ["/contact", "/help", "/faq", "/privacy", "/terms"]) {
      const response = await fetch(`${baseUrl}${path}`); const html = await response.text();
      if (!response.ok || !html.includes(temporaryBusiness) || !html.includes("support@karamebay.invalid")) throw new Error(`${path} did not use Business Profile settings.`);
    }
    const adminPage = await fetch(`${baseUrl}/admin/reviews`, { headers: { cookie: adminCookie } });
    if (!adminPage.ok || !(await adminPage.text()).includes(`${marker}-delivered`)) throw new Error("Admin review moderation page failed.");
    console.log("PASS: delivered-only, one-per-order, 24-hour edits, moderation, replies, ratings, and centralized support settings verified.");
  } finally {
    await db.businessProfile.update({ where: { id: "business" }, data: { businessName: originalBusiness.businessName, supportEmail: originalBusiness.supportEmail, supportPhone: originalBusiness.supportPhone, whatsappNumber: originalBusiness.whatsappNumber, businessAddress: originalBusiness.businessAddress, businessHours: originalBusiness.businessHours, instagramUrl: originalBusiness.instagramUrl } });
    await db.review.deleteMany({ where: { customerId } });
    await db.order.deleteMany({ where: { customerId } });
    await db.user.deleteMany({ where: { id: { in: [customerId, adminId, riderId].filter(Boolean) } } });
    const aggregate = await db.review.aggregate({ where: { storeId: store.id, moderationStatus: "VISIBLE" }, _avg: { storeRating: true } });
    await db.store.update({ where: { id: store.id }, data: { rating: aggregate._avg.storeRating ?? 0 } });
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => db.$disconnect());
