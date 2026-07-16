import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const PARCEL_STATUSES = [
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
  "CANCELLED",
  "REJECTED",
  "FAILED_DELIVERY",
] as const;

export type ParcelStatus = (typeof PARCEL_STATUSES)[number];

export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PENDING_VERIFICATION: "Pending Verification",
  AWAITING_ADMIN_REVIEW: "Awaiting Admin Review",
  CONFIRMED: "Confirmed",
  RIDER_ASSIGNED: "Rider Assigned",
  RIDER_GOING_TO_PICKUP: "Rider Going to Pickup",
  ARRIVED_AT_PICKUP: "Arrived at Pickup",
  PARCEL_PICKED_UP: "Parcel Picked Up",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  FAILED_DELIVERY: "Failed Delivery",
};

export const PARCEL_STATUS_TRANSITIONS: Record<
  ParcelStatus,
  readonly ParcelStatus[]
> = {
  PENDING_PAYMENT: ["PENDING_VERIFICATION", "CANCELLED"],
  PENDING_VERIFICATION: ["AWAITING_ADMIN_REVIEW", "CANCELLED", "REJECTED"],
  AWAITING_ADMIN_REVIEW: ["CONFIRMED", "CANCELLED", "REJECTED"],
  CONFIRMED: ["RIDER_ASSIGNED", "CANCELLED", "REJECTED"],
  RIDER_ASSIGNED: ["RIDER_GOING_TO_PICKUP", "CANCELLED", "FAILED_DELIVERY"],
  RIDER_GOING_TO_PICKUP: [
    "ARRIVED_AT_PICKUP",
    "CANCELLED",
    "FAILED_DELIVERY",
  ],
  ARRIVED_AT_PICKUP: [
    "PARCEL_PICKED_UP",
    "CANCELLED",
    "FAILED_DELIVERY",
  ],
  PARCEL_PICKED_UP: ["ON_THE_WAY", "FAILED_DELIVERY"],
  ON_THE_WAY: ["DELIVERED", "FAILED_DELIVERY"],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
  FAILED_DELIVERY: [],
};

export const PARCEL_PAYMENT_STATUSES = [
  "PENDING_PAYMENT",
  "PENDING_VERIFICATION",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const;

export type ParcelPaymentStatus = (typeof PARCEL_PAYMENT_STATUSES)[number];

export const PARCEL_ACTIVE_RIDER_STATUSES: readonly ParcelStatus[] = [
  "RIDER_ASSIGNED",
  "RIDER_GOING_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PARCEL_PICKED_UP",
  "ON_THE_WAY",
];

export const PARCEL_CUSTOMER_CANCELLABLE_STATUSES: readonly ParcelStatus[] = [
  "PENDING_PAYMENT",
  "PENDING_VERIFICATION",
  "AWAITING_ADMIN_REVIEW",
];

export const PARCEL_TERMINAL_STATUSES: readonly ParcelStatus[] = [
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
  "FAILED_DELIVERY",
];

export function isParcelStatus(value: string): value is ParcelStatus {
  return PARCEL_STATUSES.includes(value as ParcelStatus);
}

export function canTransitionParcelStatus(
  from: string,
  to: ParcelStatus,
) {
  return (
    isParcelStatus(from) && PARCEL_STATUS_TRANSITIONS[from].includes(to)
  );
}

export function parcelStatusLabel(status: string) {
  return isParcelStatus(status)
    ? PARCEL_STATUS_LABELS[status]
    : status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function canCustomerCancelParcel(status: string) {
  return (
    isParcelStatus(status) &&
    PARCEL_CUSTOMER_CANCELLABLE_STATUSES.includes(status)
  );
}

export function parcelRiderMaySeeContacts(status: string) {
  return (
    isParcelStatus(status) && PARCEL_ACTIVE_RIDER_STATUSES.includes(status)
  );
}

export type ParcelPricingConfiguration = {
  version: number;
  currency: string;
  baseFeeRwf: number;
  perKmRwf: number;
  roundingIncrementRwf: number;
  sizeSurchargeEnabled: boolean;
  weightSurchargeEnabled: boolean;
  weightFreeAllowanceKg: number;
  weightSurchargePerKgRwf: number;
  fragileSurchargeEnabled: boolean;
  fragileSurchargeRwf: number;
  carefulHandlingEnabled: boolean;
  carefulHandlingRwf: number;
  waitingTimeChargeEnabled: boolean;
  waitingGraceMinutes: number;
  waitingPerMinuteRwf: number;
  scheduledSurchargeEnabled: boolean;
  scheduledSurchargeRwf: number;
};

export type ParcelPriceInput = {
  distanceM: number;
  estimatedWeightKg: number;
  sizeSurchargeRwf: number;
  fragile: boolean;
  requiresCarefulHandling: boolean;
  scheduled: boolean;
  waitingMinutes?: number;
};

export type ParcelPriceBreakdown = {
  pricingVersion: number;
  currency: string;
  baseFeeRwf: number;
  distanceFeeRwf: number;
  sizeSurchargeRwf: number;
  weightSurchargeRwf: number;
  fragileSurchargeRwf: number;
  carefulHandlingRwf: number;
  waitingTimeChargeRwf: number;
  scheduledSurchargeRwf: number;
  extraFeesRwf: number;
  deliveryFeeRwf: number;
  totalRwf: number;
};

function requireNonNegative(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} must be a non-negative number.`);
  return value;
}

function roundToIncrement(value: number, increment: number) {
  const safeIncrement = Math.max(1, Math.round(increment));
  return Math.round(value / safeIncrement) * safeIncrement;
}

// This is deliberately independent from the food/market delivery calculator.
// Prices are always recomputed on the server from the persisted configuration.
export function calculateParcelPrice(
  configuration: ParcelPricingConfiguration,
  input: ParcelPriceInput,
): ParcelPriceBreakdown {
  const distanceM = requireNonNegative(input.distanceM, "Route distance");
  const estimatedWeightKg = requireNonNegative(
    input.estimatedWeightKg,
    "Estimated weight",
  );
  const baseFeeRwf = Math.round(
    requireNonNegative(configuration.baseFeeRwf, "Base fee"),
  );
  const rawDistanceFee =
    requireNonNegative(configuration.perKmRwf, "Per-kilometre price") *
    (distanceM / 1_000);

  const sizeSurchargeRwf = configuration.sizeSurchargeEnabled
    ? Math.round(requireNonNegative(input.sizeSurchargeRwf, "Size surcharge"))
    : 0;
  const weightSurchargeRwf = configuration.weightSurchargeEnabled
    ? Math.ceil(
        Math.max(
          0,
          estimatedWeightKg -
            requireNonNegative(
              configuration.weightFreeAllowanceKg,
              "Weight allowance",
            ),
        ) *
          requireNonNegative(
            configuration.weightSurchargePerKgRwf,
            "Weight surcharge",
          ),
      )
    : 0;
  const fragileSurchargeRwf =
    configuration.fragileSurchargeEnabled && input.fragile
      ? Math.round(
          requireNonNegative(
            configuration.fragileSurchargeRwf,
            "Fragile surcharge",
          ),
        )
      : 0;
  const carefulHandlingRwf =
    configuration.carefulHandlingEnabled && input.requiresCarefulHandling
      ? Math.round(
          requireNonNegative(
            configuration.carefulHandlingRwf,
            "Careful handling surcharge",
          ),
        )
      : 0;
  const billableWaitingMinutes = configuration.waitingTimeChargeEnabled
    ? Math.max(
        0,
        Math.ceil(requireNonNegative(input.waitingMinutes ?? 0, "Waiting time")) -
          Math.round(
            requireNonNegative(
              configuration.waitingGraceMinutes,
              "Waiting grace period",
            ),
          ),
      )
    : 0;
  const waitingTimeChargeRwf = Math.round(
    billableWaitingMinutes *
      requireNonNegative(
        configuration.waitingPerMinuteRwf,
        "Waiting-time price",
      ),
  );
  const scheduledSurchargeRwf =
    configuration.scheduledSurchargeEnabled && input.scheduled
      ? Math.round(
          requireNonNegative(
            configuration.scheduledSurchargeRwf,
            "Scheduled-delivery surcharge",
          ),
        )
      : 0;
  const extraFeesRwf =
    sizeSurchargeRwf +
    weightSurchargeRwf +
    fragileSurchargeRwf +
    carefulHandlingRwf +
    waitingTimeChargeRwf +
    scheduledSurchargeRwf;
  const deliveryFeeRwf = Math.max(
    baseFeeRwf + extraFeesRwf,
    roundToIncrement(
      baseFeeRwf + rawDistanceFee + extraFeesRwf,
      configuration.roundingIncrementRwf,
    ),
  );
  // Put the rounding adjustment in the distance component so every displayed
  // component still sums exactly to the persisted total.
  const distanceFeeRwf = Math.max(
    0,
    deliveryFeeRwf - baseFeeRwf - extraFeesRwf,
  );

  return {
    pricingVersion: configuration.version,
    currency: configuration.currency,
    baseFeeRwf,
    distanceFeeRwf,
    sizeSurchargeRwf,
    weightSurchargeRwf,
    fragileSurchargeRwf,
    carefulHandlingRwf,
    waitingTimeChargeRwf,
    scheduledSurchargeRwf,
    extraFeesRwf,
    deliveryFeeRwf,
    totalRwf: deliveryFeeRwf,
  };
}

export function formatParcelReference(sequence: number) {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new Error("Parcel sequence must be a positive integer.");
  return `KB-PCL-${String(sequence).padStart(6, "0")}`;
}

export const PARCEL_CONFIRMATION_MAX_ATTEMPTS = 6;
export type ParcelConfirmationCodeLength = 4 | 6;

function parcelConfirmationSecret() {
  const secret =
    process.env.PARCEL_CONFIRMATION_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "PARCEL_CONFIRMATION_SECRET or AUTH_SECRET must contain at least 32 characters.",
    );
  return secret;
}

export function generateParcelConfirmationCode(
  length: ParcelConfirmationCodeLength = 6,
) {
  return randomInt(0, 10 ** length).toString().padStart(length, "0");
}

export function hashParcelConfirmationCode(
  parcelDeliveryId: string,
  code: string,
) {
  return createHmac("sha256", parcelConfirmationSecret())
    .update(`${parcelDeliveryId}:${code}`)
    .digest("hex");
}

export function parcelConfirmationCodeMatches(
  parcelDeliveryId: string,
  code: string,
  expectedHash: string,
) {
  if (!/^\d{4}(?:\d{2})?$/.test(code)) return false;
  const received = Buffer.from(
    hashParcelConfirmationCode(parcelDeliveryId, code),
    "hex",
  );
  const expected = Buffer.from(expectedHash, "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
