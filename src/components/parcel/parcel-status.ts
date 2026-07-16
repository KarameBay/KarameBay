export const PARCEL_STATUS_FLOW = [
  "PENDING_PAYMENT",
  "PENDING_VERIFICATION",
  "AWAITING_ADMIN_REVIEW",
  "CONFIRMED",
  "RIDER_ASSIGNED",
  "RIDER_GOING_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PARCEL_PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
] as const;

const labels: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  PENDING_VERIFICATION: "Pending verification",
  AWAITING_ADMIN_REVIEW: "Awaiting admin review",
  CONFIRMED: "Confirmed",
  RIDER_ASSIGNED: "Rider assigned",
  RIDER_GOING_TO_PICKUP: "Rider going to pickup",
  ARRIVED_AT_PICKUP: "Arrived at pickup",
  PARCEL_PICKED_UP: "Parcel picked up",
  ON_THE_WAY: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  FAILED_DELIVERY: "Failed delivery",
};

export const parcelStatusLabel = (status: string) =>
  labels[status] ??
  status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());

export const terminalParcelStatus = (status: string) =>
  ["DELIVERED", "CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(
    status,
  );

export const customerCanCancelParcel = (status: string) =>
  [
    "PENDING_PAYMENT",
    "PENDING_VERIFICATION",
    "AWAITING_ADMIN_REVIEW",
  ].includes(status);

