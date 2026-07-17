import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendSmtpMail } from "@/lib/smtp";
import { OrderStatus } from "@/lib/order-status";
import { getBusinessProfile, SYSTEM_BUSINESS_DEFAULTS } from "@/lib/business-profile";

type Role = "CUSTOMER" | "ADMIN" | "RIDER";
type Channel = "INTERNAL" | "EMAIL";

type NotificationInput = {
  userId: string;
  userRole: Role;
  orderId: string;
  type: string;
  title: string;
  message: string;
  channel?: Channel;
};

type EmailLogInput = {
  notificationId?: string | null;
  userId?: string | null;
  orderId?: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "PENDING" | "SENT" | "FAILED";
  errorMessage?: string | null;
  sentAt?: Date | null;
};

let emailLogSchemaReady: Promise<void> | null = null;

async function ensureEmailLogTable() {
  // The table is created by Prisma migrations. This function remains as a
  // compatibility boundary for older callers but intentionally performs no
  // runtime DDL, so Railway startup never mutates schema unexpectedly.
  emailLogSchemaReady ??= Promise.resolve();
  return emailLogSchemaReady;
}

async function createEmailLog(input: EmailLogInput) {
  const id = randomUUID();
  try {
    await ensureEmailLogTable();
    await db.emailNotificationLog.create({
      data: {
        id,
        notificationId: input.notificationId ?? null,
        userId: input.userId ?? null,
        orderId: input.orderId ?? null,
        recipientEmail: input.recipientEmail,
        subject: input.subject,
        body: input.body,
        channel: "EMAIL",
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        sentAt: input.sentAt ?? null,
      },
    });
  } catch {
    return null;
  }
  return id;
}

async function updateEmailLog(
  id: string,
  input: Partial<EmailLogInput> & { status: "PENDING" | "SENT" | "FAILED" },
) {
  try {
    await db.emailNotificationLog.update({
      where: { id },
      data: {
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        sentAt: input.sentAt ?? null,
      },
    });
  } catch {}
}

async function writeNotificationEmail(
  input: Omit<EmailLogInput, "status" | "sentAt">,
  send: () => Promise<{ ok: boolean; error?: string }>,
) {
  const logId = await createEmailLog({ ...input, status: "PENDING" });
  const result = await send();
  if (result.ok) {
    if (logId) await updateEmailLog(logId, { status: "SENT", sentAt: new Date() });
    return { ok: true as const };
  }
  if (logId) {
    await updateEmailLog(logId, {
      status: "FAILED",
      errorMessage: result.error ?? "Unknown SMTP error",
    });
  }
  return { ok: false as const, error: result.error };
}

async function createInternalNotification(
  tx: Prisma.TransactionClient,
  input: NotificationInput,
) {
  await tx.notification.upsert({
    where: {
      userId_orderId_type: {
        userId: input.userId,
        orderId: input.orderId,
        type: input.type,
      },
    },
    update: {
      title: input.title,
      message: input.message,
    },
    create: {
      userId: input.userId,
      orderId: input.orderId,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  });
}

async function notifyActiveAdmins(
  tx: Prisma.TransactionClient,
  orderId: string,
  orderNumber: string,
  title: string,
  message: string,
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createInternalNotification(tx, {
        userId: admin.id,
        userRole: "ADMIN",
        orderId,
        type: "ADMIN_ORDER_UPDATE",
        title,
        message: `${message} (${orderNumber})`,
      }),
    ),
  );
}

export function customerOrderHref(orderNumber: string) {
  return `/orders/${orderNumber}/track`;
}

export function operationsOrderHref(role: Role, orderId: string) {
  const base = role === "RIDER" ? "/rider" : "/admin";
  return `${base}?orderId=${orderId}`;
}

export async function notifyOrderPlaced(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string; grandTotalRwf: number };
    store: { id: string; name: string; ownerId: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_PLACED",
    title: "Order placed",
    message: `Your order ${input.order.orderNumber} has been placed and is pending payment verification.`,
  });
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "PAYMENT_PENDING_VERIFICATION",
    title: "Payment pending verification",
    message: `We received your MoMo payment confirmation for ${input.order.orderNumber}.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "NEW_ORDER_RECEIVED",
    title: "New order received",
    message: `A new order ${input.order.orderNumber} has been received for ${input.store.name}.`,
  });
  await notifyActiveAdmins(
    tx,
    input.order.id,
    input.order.orderNumber,
    "New order placed",
    "A new customer order has been placed",
  );
}

export async function notifyPaymentVerified(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string; grandTotalRwf: number };
    store: { ownerId: string; name: string };
    customer: { firstName: string; email: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "PAYMENT_VERIFIED",
    title: "Payment verified",
    message: `Your payment for ${input.order.orderNumber} has been verified.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "PAYMENT_VERIFIED_STORE",
    title: "Payment verified",
    message: `Payment for ${input.order.orderNumber} has been verified.`,
  });
  await notifyActiveAdmins(
    tx,
    input.order.id,
    input.order.orderNumber,
    "Customer confirmed MoMo payment",
    "A customer payment has been verified by admin",
  );
}

export async function notifyOrderAccepted(
  tx: Prisma.TransactionClient,
  input: {
    order: {
      id: string;
      customerId: string;
      orderNumber: string;
      grandTotalRwf: number;
    };
    store: { name: string; ownerId: string; preparationMinutes: number | null };
    customer: { firstName: string; lastName: string; email: string };
  },
) {
  const business = await tx.businessProfile.findUnique({ where: { id: "business" }, select: { businessName: true } });
  const businessName = business?.businessName ?? SYSTEM_BUSINESS_DEFAULTS.businessName;
  const preparation = input.store.preparationMinutes
    ? `${input.store.preparationMinutes} minutes`
    : "soon";
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_ACCEPTED",
    title: "Order accepted",
    message: `Your order ${input.order.orderNumber} from ${input.store.name} was accepted. Preparation takes about ${preparation}.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "ORDER_ACCEPTED_STORE",
    title: "Order accepted",
    message: `You accepted ${input.order.orderNumber} for ${input.store.name}.`,
  });
  await notifyActiveAdmins(
    tx,
    input.order.id,
    input.order.orderNumber,
    "Store accepted order",
    `${input.store.name} accepted order ${input.order.orderNumber}`,
  );
  const subject = `Your ${businessName} Order Has Been Accepted 🎉`;
  const body = [
    `Hello ${input.customer.firstName},`,
    "",
    `Your ${businessName} order ${input.order.orderNumber} from ${input.store.name} has been accepted.`,
    `Total amount: RWF ${input.order.grandTotalRwf.toLocaleString("en-RW")}`,
    preparation === "soon"
      ? ""
      : `Estimated preparation time: ${preparation}.`,
    "",
    `Thank you for ordering with ${businessName}.`,
  ]
    .filter(Boolean)
    .join("\n");
  void writeNotificationEmail(
    {
      notificationId: null,
      userId: input.order.customerId,
      orderId: input.order.id,
      recipientEmail: input.customer.email,
      subject,
      body,
    },
    () =>
      sendSmtpMail({
        to: input.customer.email,
        subject,
        text: body,
      }),
  );
}

export async function notifyReadyForPickup(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string };
    store: { name: string; ownerId: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_READY_FOR_PICKUP",
    title: "Ready for pickup",
    message: `Your order ${input.order.orderNumber} is ready for pickup at ${input.store.name}.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "ORDER_READY_FOR_ASSIGNMENT",
    title: "Order ready for rider assignment",
    message: `Order ${input.order.orderNumber} is ready for rider assignment.`,
  });
  await notifyActiveAdmins(
    tx,
    input.order.id,
    input.order.orderNumber,
    "Order ready for rider assignment",
    `Order ${input.order.orderNumber} is waiting for rider assignment`,
  );
}

export async function notifyRiderAssigned(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string };
    store: { name: string; ownerId: string };
    rider: { id: string; firstName: string; lastName: string; phone: string };
    admin: { firstName: string; lastName: string };
  },
) {
  const riderName = `${input.rider.firstName} ${input.rider.lastName}`;
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "RIDER_ASSIGNED",
    title: "Rider assigned",
    message: `${riderName} has been assigned to ${input.order.orderNumber}.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "RIDER_ASSIGNED_STORE",
    title: "Rider assigned",
    message: `${riderName} has been assigned to ${input.order.orderNumber}.`,
  });
  await createInternalNotification(tx, {
    userId: input.rider.id,
    userRole: "RIDER",
    orderId: input.order.id,
    type: "DELIVERY_ASSIGNED",
    title: "New delivery assigned",
    message: `You have been assigned ${input.order.orderNumber} by ${input.admin.firstName} ${input.admin.lastName}.`,
  });
}

export async function notifyPickedUp(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string };
    store: { name: string; ownerId: string };
    rider: { id: string; firstName: string; lastName: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_PICKED_UP",
    title: "Order picked up",
    message: `${input.rider.firstName} ${input.rider.lastName} picked up ${input.order.orderNumber}.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "ORDER_PICKED_UP_STORE",
    title: "Order picked up",
    message: `Rider picked up ${input.order.orderNumber}.`,
  });
}

export async function notifyOnTheWay(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_ON_THE_WAY",
    title: "On the way",
    message: `Your order ${input.order.orderNumber} is on the way.`,
  });
}

export async function notifyDelivered(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string; grandTotalRwf: number };
    store: { name: string; ownerId: string };
    customer: { firstName: string; email: string };
    rider: { firstName: string; lastName: string };
  },
) {
  const business = await tx.businessProfile.findUnique({ where: { id: "business" }, select: { businessName: true } });
  const businessName = business?.businessName ?? SYSTEM_BUSINESS_DEFAULTS.businessName;
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_DELIVERED",
    title: "Order delivered",
    message: `Your ${businessName} order ${input.order.orderNumber} has been delivered.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "ORDER_DELIVERED_STORE",
    title: "Order delivered",
    message: `${input.order.orderNumber} was delivered successfully.`,
  });
  await notifyActiveAdmins(
    tx,
    input.order.id,
    input.order.orderNumber,
    "Rider completed delivery",
    `Delivery completed for ${input.order.orderNumber}`,
  );
  const subject = `Your ${businessName} Order Has Been Delivered ✅`;
  const body = [
    `Hello ${input.customer.firstName},`,
    "",
    `Your ${businessName} order ${input.order.orderNumber} from ${input.store.name} has been delivered.`,
    `Total amount: RWF ${input.order.grandTotalRwf.toLocaleString("en-RW")}`,
    "",
    `Thank you for choosing ${businessName}.`,
    "We would love your feedback and rating on your delivery experience.",
  ].join("\n");
  void writeNotificationEmail(
    {
      notificationId: null,
      userId: input.order.customerId,
      orderId: input.order.id,
      recipientEmail: input.customer.email,
      subject,
      body,
    },
    () =>
      sendSmtpMail({
        to: input.customer.email,
        subject,
        text: body,
      }),
  );
}

export async function notifyCancelled(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string };
    store: { ownerId: string; name: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_CANCELLED",
    title: "Order cancelled",
    message: `Your order ${input.order.orderNumber} was cancelled.`,
  });
  await createInternalNotification(tx, {
    userId: input.store.ownerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "ORDER_CANCELLED_STORE",
    title: "Order cancelled",
    message: `${input.order.orderNumber} was cancelled.`,
  });
  await notifyActiveAdmins(
    tx,
    input.order.id,
    input.order.orderNumber,
    "Order cancelled",
    `Order ${input.order.orderNumber} was cancelled`,
  );
}

export async function notifyRejected(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string };
    store: { ownerId: string; name: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "ORDER_REJECTED",
    title: "Order rejected",
    message: `Your order ${input.order.orderNumber} was rejected by ${input.store.name}.`,
  });
  await notifyActiveAdmins(
    tx,
    input.order.id,
    input.order.orderNumber,
    "Store rejected order",
    `Order ${input.order.orderNumber} was rejected by ${input.store.name}`,
  );
}

export async function createOrderNotification(
  tx: Prisma.TransactionClient,
  order: { id: string; customerId: string; orderNumber: string },
  status: OrderStatus,
) {
  if (status === "ACCEPTED") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_ACCEPTED",
      title: "Order accepted",
      message: `Your order ${order.orderNumber} has been accepted.`,
    });
    return;
  }
  if (status === "PREPARING") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_PREPARING",
      title: "Preparing",
      message: `Your order ${order.orderNumber} is being prepared.`,
    });
    return;
  }
  if (status === "READY_FOR_PICKUP") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_READY_FOR_PICKUP",
      title: "Ready for pickup",
      message: `Your order ${order.orderNumber} is ready for pickup.`,
    });
    return;
  }
  if (status === "PICKED_UP") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_PICKED_UP",
      title: "Order picked up",
      message: `Your order ${order.orderNumber} has been picked up.`,
    });
    return;
  }
  if (status === "ON_THE_WAY") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_ON_THE_WAY",
      title: "On the way",
      message: `Your order ${order.orderNumber} is on the way.`,
    });
    return;
  }
  if (status === "DELIVERED") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_DELIVERED",
      title: "Order delivered",
      message: `Your order ${order.orderNumber} was delivered.`,
    });
    return;
  }
  if (status === "CANCELLED") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_CANCELLED",
      title: "Order cancelled",
      message: `Your order ${order.orderNumber} was cancelled.`,
    });
    return;
  }
  if (status === "REJECTED") {
    await createInternalNotification(tx, {
      userId: order.customerId,
      userRole: "CUSTOMER",
      orderId: order.id,
      type: "ORDER_REJECTED",
      title: "Order rejected",
      message: `Your order ${order.orderNumber} was rejected.`,
    });
  }
}

export async function createRiderAssignmentNotifications(
  tx: Prisma.TransactionClient,
  input: {
    order: { id: string; customerId: string; orderNumber: string };
    storeName: string;
    storeOwnerId: string;
    rider: { id: string; firstName: string; lastName: string; phone: string };
    admin: { firstName: string; lastName: string };
  },
) {
  await createInternalNotification(tx, {
    userId: input.order.customerId,
    userRole: "CUSTOMER",
    orderId: input.order.id,
    type: "RIDER_ASSIGNED",
    title: "Rider assigned",
    message: `${input.rider.firstName} ${input.rider.lastName} has been assigned to ${input.order.orderNumber} from ${input.storeName}.`,
  });
  await createInternalNotification(tx, {
    userId: input.storeOwnerId,
    userRole: "ADMIN",
    orderId: input.order.id,
    type: "RIDER_ASSIGNED_STORE",
    title: "Rider assigned",
    message: `${input.rider.firstName} ${input.rider.lastName} has been assigned to ${input.order.orderNumber} from ${input.storeName}.`,
  });
  await createInternalNotification(tx, {
    userId: input.rider.id,
    userRole: "RIDER",
    orderId: input.order.id,
    type: "DELIVERY_ASSIGNED",
    title: "New delivery assigned",
    message: `You have been assigned ${input.order.orderNumber} from ${input.storeName} by ${input.admin.firstName} ${input.admin.lastName}.`,
  });
}

export async function sendCustomerEmailNotification(input: {
  notificationId?: string | null;
  userId?: string | null;
  orderId?: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
}) {
  return writeNotificationEmail(input, () =>
    sendSmtpMail({
      to: input.recipientEmail,
      subject: input.subject,
      text: input.body,
    }),
  );
}

export async function sendTestEmail(recipientEmail: string) {
  const business = await getBusinessProfile();
  const subject = `${business.businessName} Email System Test`;
  const body = `Hello,

This is a test email from the ${business.businessName} notification system.

If you received this email, Karame Bay email delivery is working correctly.

Regards,
${business.businessName} Team`;
  return sendCustomerEmailNotification({
    recipientEmail,
    subject,
    body,
  });
}


