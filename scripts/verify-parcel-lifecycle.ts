import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
function requiredTestPassword() {
  const value = process.env.TEST_ACCOUNT_PASSWORD;
  if (!value) throw new Error("TEST_ACCOUNT_PASSWORD is required.");
  return value;
}
const testPassword = requiredTestPassword();
const createdParcelIds: string[] = [];
let temporaryRiderId = "";

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(path: string, options: RequestInit = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login(email: string, audience: "customer" | "staff") {
  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: testPassword, audience }),
  });
  check(response.ok, `Login failed for ${email}: ${data.error ?? response.status}`);
  const role = data.user?.role as "CUSTOMER" | "ADMIN" | "RIDER";
  const cookieName = {
    CUSTOMER: "karame_customer_session",
    ADMIN: "karame_admin_session",
    RIDER: "karame_rider_session",
  }[role];
  check(cookieName, `Unsupported login role for ${email}`);
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(new RegExp(`${cookieName}=([^;,]+)`));
  check(match, `No isolated ${role} cookie was returned`);
  return `${cookieName}=${match[1]}`;
}

async function patch(path: string, cookie: string, body: object) {
  return request(path, { method: "PATCH", body: JSON.stringify(body) }, cookie);
}

async function createParcel(customerCookie: string, overrides: Record<string, unknown> = {}) {
  const input = {
    pickupContactName: "Aline Customer",
    pickupPhone: "0788000003",
    pickupLatitude: -1.9441,
    pickupLongitude: 30.0619,
    pickupAddress: "Kigali Heights, Kigali",
    pickupAddressDetails: "Main entrance",
    pickupInstructions: "Call on arrival",
    pickupPreference: "NOW",
    scheduledPickupAt: "",
    recipientName: "Parcel Recipient",
    recipientPhone: "+250788123456",
    deliveryLatitude: -1.9706,
    deliveryLongitude: 30.1044,
    deliveryAddress: "Nyarugenge, Kigali",
    deliveryAddressDetails: "Reception desk",
    deliveryInstructions: "Hand to the named recipient",
    categoryName: "Documents",
    parcelDescription: "Sealed lifecycle test envelope",
    quantity: 1,
    estimatedWeightKg: 1,
    sizeCode: "SMALL",
    fragile: false,
    requiresCarefulHandling: false,
    declaredValueRwf: 5_000,
    detailsAccurate: true,
    prohibitedItemsConfirmed: true,
    safePackagingConfirmed: true,
    recipientAvailableConfirmed: true,
    paymentConfirmed: true,
    ...overrides,
  };
  return request(
    "/api/parcels",
    { method: "POST", body: JSON.stringify(input) },
    customerCookie,
  );
}

async function cleanup() {
  if (createdParcelIds.length) {
    await db.parcelDelivery.deleteMany({ where: { id: { in: createdParcelIds } } });
  }
  if (temporaryRiderId) {
    await db.user.deleteMany({ where: { id: temporaryRiderId } });
  }
}

async function main() {
  const customerCookie = await login("customer@karamebay.rw", "customer");
  const adminCookie = await login("admin@karamebay.rw", "staff");
  const riderCookie = await login("rider@karamebay.rw", "staff");

  const invalidPhone = await createParcel(customerCookie, { pickupPhone: "123" });
  check(invalidPhone.response.status === 400, "Invalid parcel phone was accepted");
  const missingLocation = await createParcel(customerCookie, { pickupLatitude: undefined });
  check(missingLocation.response.status === 400, "Missing pickup location was accepted");
  const uncheckedSafety = await createParcel(customerCookie, { prohibitedItemsConfirmed: false });
  check(uncheckedSafety.response.status === 400, "Unchecked prohibited-item confirmation was accepted");
  const unsupported = await createParcel(customerCookie, {
    estimatedWeightKg: 900,
    sizeCode: "SMALL",
  });
  check(unsupported.response.status === 422, "Unsupported parcel capacity was accepted");

  const created = await createParcel(customerCookie);
  check(created.response.status === 201, `Parcel creation failed: ${created.data.error}`);
  const reference = String(created.data.parcel?.referenceNumber ?? "");
  check(/^KB-PCL-\d{6}$/.test(reference), "Readable parcel reference was not created");
  check(!created.data.parcel?.id, "Customer parcel creation exposed a raw database ID");
  const createdRow = await db.parcelDelivery.findUniqueOrThrow({
    where: { referenceNumber: reference },
    select: { id: true },
  });
  const parcelId = createdRow.id;
  createdParcelIds.push(parcelId);

  const riderBeforeAssignment = await request("/api/rider/parcels", {}, riderCookie);
  check(riderBeforeAssignment.response.ok, "Rider parcel list failed");
  check(
    !riderBeforeAssignment.data.active.some((item: { id: string }) => item.id === parcelId),
    "Rider saw a parcel before manual assignment",
  );
  const selfClaim = await patch(`/api/rider/parcels/${parcelId}`, riderCookie, {
    action: "UPDATE_STATUS",
    status: "RIDER_GOING_TO_PICKUP",
  });
  check(!selfClaim.response.ok, "Rider self-claimed an unassigned parcel");

  const earlyApproval = await patch(`/api/admin/parcels/${parcelId}`, adminCookie, {
    action: "APPROVE",
  });
  check(!earlyApproval.response.ok, "Admin approved a parcel before payment verification");
  const bypassedPaymentVerification = await patch(
    `/api/admin/parcels/${parcelId}`,
    adminCookie,
    { action: "UPDATE_STATUS", status: "AWAITING_ADMIN_REVIEW" },
  );
  check(
    !bypassedPaymentVerification.response.ok,
    "Generic status update bypassed parcel payment verification",
  );
  const verified = await patch(`/api/admin/parcels/${parcelId}`, adminCookie, {
    action: "VERIFY_PAYMENT",
  });
  check(verified.response.ok, `Parcel payment verification failed: ${verified.data.error}`);
  const bypassedApproval = await patch(
    `/api/admin/parcels/${parcelId}`,
    adminCookie,
    { action: "UPDATE_STATUS", status: "CONFIRMED" },
  );
  check(
    !bypassedApproval.response.ok,
    "Generic status update bypassed parcel approval and confirmation-code creation",
  );
  const approved = await patch(`/api/admin/parcels/${parcelId}`, adminCookie, {
    action: "APPROVE",
  });
  check(approved.response.ok, `Parcel approval failed: ${approved.data.error}`);

  const trackingWithCode = await request(
    `/api/parcels/${encodeURIComponent(reference)}`,
    { cache: "no-store" },
    customerCookie,
  );
  check(trackingWithCode.response.ok, "Customer parcel tracking failed after approval");
  const confirmationCode = String(trackingWithCode.data.parcel?.deliveryConfirmationCode ?? "");
  check(/^\d{6}$/.test(confirmationCode), "Owning customer did not receive the six-digit confirmation code");

  const rider = await db.user.findUniqueOrThrow({
    where: { email: "rider@karamebay.rw" },
    select: { id: true },
  });
  const assigned = await patch(`/api/admin/parcels/${parcelId}`, adminCookie, {
    action: "ASSIGN_RIDER",
    riderId: rider.id,
  });
  check(assigned.response.ok, `Manual parcel assignment failed: ${assigned.data.error}`);

  const temporaryEmail = `parcel-reassign-${Date.now()}@karamebay.test`;
  const temporary = await db.user.create({
    data: {
      email: temporaryEmail,
      phone: `+25079${String(Date.now()).slice(-7)}`,
      firstName: "Parcel",
      lastName: "Relief Rider",
      role: "RIDER",
      status: "ACTIVE",
      passwordHash: await hash(testPassword, 10),
      riderProfile: { create: { riderStatus: "AVAILABLE", vehicleType: "MOTORCYCLE" } },
    },
    select: { id: true },
  });
  temporaryRiderId = temporary.id;
  const reassignedAway = await patch(`/api/admin/parcels/${parcelId}`, adminCookie, {
    action: "REASSIGN_RIDER",
    riderId: temporary.id,
    reason: "Lifecycle reassignment test",
  });
  check(reassignedAway.response.ok, `Parcel reassignment failed: ${reassignedAway.data.error}`);
  const reassignedBack = await patch(`/api/admin/parcels/${parcelId}`, adminCookie, {
    action: "REASSIGN_RIDER",
    riderId: rider.id,
    reason: "Return lifecycle assignment",
  });
  check(reassignedBack.response.ok, `Parcel reassignment back failed: ${reassignedBack.data.error}`);

  const riderAssigned = await request("/api/rider/parcels", {}, riderCookie);
  const activeParcel = riderAssigned.data.active.find((item: { id: string }) => item.id === parcelId);
  check(activeParcel, "Admin-assigned parcel did not appear in the rider portal");
  check(activeParcel.pickupPhone && activeParcel.recipientPhone, "Assigned rider could not see active parcel contacts");

  for (const status of [
    "RIDER_GOING_TO_PICKUP",
    "ARRIVED_AT_PICKUP",
    "PARCEL_PICKED_UP",
    "ON_THE_WAY",
  ]) {
    const result = await patch(`/api/rider/parcels/${parcelId}`, riderCookie, {
      action: "UPDATE_STATUS",
      status,
    });
    check(result.response.ok, `Rider parcel status ${status} failed: ${result.data.error}`);
  }

  const wrongCode = await patch(`/api/rider/parcels/${parcelId}`, riderCookie, {
    action: "UPDATE_STATUS",
    status: "DELIVERED",
    confirmationCode: "000000" === confirmationCode ? "111111" : "000000",
    recipientName: "Parcel Recipient",
  });
  check(!wrongCode.response.ok, "Wrong parcel delivery code was accepted");
  const delivered = await patch(`/api/rider/parcels/${parcelId}`, riderCookie, {
    action: "UPDATE_STATUS",
    status: "DELIVERED",
    confirmationCode,
    recipientName: "Parcel Recipient",
  });
  check(delivered.response.ok, `Correct parcel delivery confirmation failed: ${delivered.data.error}`);

  const finalTracking = await request(
    `/api/parcels/${encodeURIComponent(reference)}`,
    { cache: "no-store" },
    customerCookie,
  );
  check(finalTracking.data.parcel?.status === "DELIVERED", "Customer did not see parcel completion");
  check(!finalTracking.data.parcel?.deliveryConfirmationCode, "Delivery code remained visible after completion");

  const riderAfterDelivery = await request("/api/rider/parcels", {}, riderCookie);
  const completedParcel = riderAfterDelivery.data.completed.find((item: { id: string }) => item.id === parcelId);
  check(completedParcel, "Completed parcel is missing from rider history");
  check(!completedParcel.pickupPhone && !completedParcel.recipientPhone, "Rider retained contact access after delivery");

  const cancellationCandidate = await createParcel(customerCookie, {
    parcelDescription: "Cancellation lifecycle envelope",
  });
  check(cancellationCandidate.response.status === 201, `Cancellation parcel failed: ${cancellationCandidate.data.error}`);
  const cancellationReference = String(cancellationCandidate.data.parcel.referenceNumber);
  const cancellationRow = await db.parcelDelivery.findUniqueOrThrow({
    where: { referenceNumber: cancellationReference },
    select: { id: true },
  });
  const cancellationId = cancellationRow.id;
  createdParcelIds.push(cancellationId);
  const cancelled = await patch(
    `/api/parcels/${encodeURIComponent(cancellationReference)}`,
    customerCookie,
    { action: "CANCEL", reason: "Lifecycle cancellation test" },
  );
  check(cancelled.response.ok, `Early customer cancellation failed: ${cancelled.data.error}`);

  const final = await db.parcelDelivery.findUniqueOrThrow({
    where: { id: parcelId },
    include: {
      payment: true,
      confirmation: true,
      events: true,
      riderAssignments: true,
      notifications: true,
    },
  });
  check(final.payment?.status === "PAID", "Delivered parcel payment is not paid");
  check(final.confirmation?.verifiedAt, "Delivery confirmation was not recorded");
  check(final.riderAssignments.length >= 3, "Parcel reassignment history is incomplete");
  check(final.events.some((event) => event.status === "DELIVERED"), "Delivered status history is missing");
  check(final.notifications.length >= 1, "Parcel internal notifications are missing");

  console.log(
    JSON.stringify(
      {
        result: "PASS",
        reference,
        status: final.status,
        payment: final.payment.status,
        distanceKm: Number((final.distanceM / 1_000).toFixed(1)),
        deliveryFeeRwf: final.deliveryFeeRwf,
        events: final.events.length,
        assignments: final.riderAssignments.length,
        security: {
          isolatedSessions: true,
          riderSelfClaimBlocked: true,
          wrongCodeBlocked: true,
          contactsHiddenAfterDelivery: true,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) => console.error("Parcel test cleanup failed", error));
    await db.$disconnect();
  });
