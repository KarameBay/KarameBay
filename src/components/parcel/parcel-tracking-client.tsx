"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  Check,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Route,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRwf } from "@/lib/catalog";
import { SUPPORT_WHATSAPP_URL } from "@/lib/contact";
import { formatKigaliDateTime } from "@/lib/date-format";
import { ParcelRouteMapLoader } from "./parcel-route-map-loader";
import {
  customerCanCancelParcel,
  PARCEL_STATUS_FLOW,
  parcelStatusLabel,
  terminalParcelStatus,
} from "./parcel-status";

type ParcelEvent = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
};

type TrackedParcel = {
  referenceNumber: string;
  status: string;
  createdAt: string;
  pickupContactName: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupAddressDetails: string;
  pickupInstructions: string | null;
  recipientName: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryAddress: string;
  deliveryAddressDetails: string;
  deliveryInstructions: string | null;
  categoryName: string;
  parcelDescription: string;
  sizeName: string;
  estimatedWeightKg: number;
  fragile: boolean;
  distanceM: number;
  estimatedDurationS: number;
  deliveryFeeRwf: number;
  totalRwf: number;
  paymentStatus: string;
  assignedRider: {
    name: string;
    vehicleType: string | null;
  } | null;
  riderPoint: { latitude: number; longitude: number } | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  route: [number, number][];
  deliveryConfirmationCode: string | null;
  events: ParcelEvent[];
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function routePoints(value: unknown): [number, number][] {
  if (typeof value === "string") {
    try {
      return routePoints(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])),
    )
    .map((point) => [Number(point[0]), Number(point[1])]);
}

function normaliseParcel(value: unknown): TrackedParcel {
  const source = object(value);
  const rider = object(source.assignedRider ?? source.rider);
  const riderProfile = object(rider.riderProfile);
  const payment = object(source.payment);
  const confirmation = object(source.confirmation);
  const firstName = text(rider.firstName);
  const lastName = text(rider.lastName);
  const riderName =
    text(rider.name) || `${firstName} ${lastName}`.trim() || "Assigned rider";
  const riderLatitude = source.riderCurrentLatitude;
  const riderLongitude = source.riderCurrentLongitude;
  const events = Array.isArray(source.events)
    ? source.events.map((item, index) => {
        const event = object(item);
        return {
          id: text(event.id, String(index)),
          status: text(event.status),
          note: text(event.note) || null,
          createdAt: text(event.createdAt, new Date().toISOString()),
        };
      })
    : [];
  const riderRoute = routePoints(
    source.liveRoute ?? source.riderRoute ?? source.riderRouteJson,
  );
  const quotedRoute = routePoints(
    source.quotedRoute ?? source.quotedRouteJson,
  );

  return {
    referenceNumber: text(source.referenceNumber ?? source.reference),
    status: text(source.status, "PENDING_VERIFICATION"),
    createdAt: text(source.createdAt, new Date().toISOString()),
    pickupContactName: text(source.pickupContactName),
    pickupLatitude: number(source.pickupLatitude),
    pickupLongitude: number(source.pickupLongitude),
    pickupAddress: text(source.pickupAddress),
    pickupAddressDetails: text(source.pickupAddressDetails),
    pickupInstructions: text(source.pickupInstructions) || null,
    recipientName: text(source.recipientName),
    deliveryLatitude: number(source.deliveryLatitude),
    deliveryLongitude: number(source.deliveryLongitude),
    deliveryAddress: text(source.deliveryAddress),
    deliveryAddressDetails: text(source.deliveryAddressDetails),
    deliveryInstructions: text(source.deliveryInstructions) || null,
    categoryName: text(source.categoryName, "Parcel"),
    parcelDescription: text(source.parcelDescription),
    sizeName: text(source.sizeName ?? source.sizeCode, "Parcel"),
    estimatedWeightKg: number(source.estimatedWeightKg),
    fragile: Boolean(source.fragile),
    distanceM: number(source.distanceM),
    estimatedDurationS: number(source.estimatedDurationS),
    deliveryFeeRwf: number(source.deliveryFeeRwf),
    totalRwf: number(source.totalRwf ?? source.deliveryFeeRwf),
    paymentStatus: text(source.paymentStatus ?? payment.status, "PENDING_VERIFICATION"),
    assignedRider:
      Object.keys(rider).length > 0
        ? {
            name: riderName,
            vehicleType:
              text(rider.vehicleType ?? riderProfile.vehicleType) || null,
          }
        : null,
    riderPoint:
      riderLatitude != null && riderLongitude != null
        ? {
            latitude: number(riderLatitude),
            longitude: number(riderLongitude),
          }
        : null,
    remainingDistanceM:
      source.remainingDistanceM == null
        ? null
        : number(source.remainingDistanceM),
    remainingDurationS:
      source.remainingDurationS == null
        ? null
        : number(source.remainingDurationS),
    route: riderRoute.length > 1 ? riderRoute : quotedRoute,
    deliveryConfirmationCode:
      text(
        source.deliveryConfirmationCode ??
          source.confirmationCode ??
          confirmation.code,
      ) || null,
    events,
  };
}

export function ParcelTrackingClient({ reference }: { reference: string }) {
  const [parcel, setParcel] = useState<TrackedParcel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setRefreshing(quiet);
      try {
        const response = await fetch(`/api/parcels/${encodeURIComponent(reference)}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error ?? "Parcel tracking is unavailable.");
        setParcel(normaliseParcel(data.parcel ?? data));
        setError("");
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Parcel tracking is unavailable.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [reference],
  );

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    if (!parcel || terminalParcelStatus(parcel.status)) return;
    const timer = window.setInterval(() => void refresh(true), 8_000);
    return () => window.clearInterval(timer);
  }, [parcel, refresh]);

  async function cancel() {
    if (!parcel || !window.confirm("Cancel this parcel request?")) return;
    setCancelling(true);
    setError("");
    try {
      const response = await fetch(`/api/parcels/${encodeURIComponent(reference)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error ?? "This parcel could not be cancelled.");
      await refresh(true);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "This parcel could not be cancelled.",
      );
    } finally {
      setCancelling(false);
    }
  }

  const currentStep = useMemo(
    () => (parcel ? PARCEL_STATUS_FLOW.indexOf(parcel.status as never) : -1),
    [parcel],
  );

  if (loading)
    return (
      <main className="parcel-tracking-loading">
        <RefreshCw /> Loading parcel tracking…
      </main>
    );

  if (!parcel)
    return (
      <main className="parcel-tracking-error">
        <Package />
        <h1>Parcel not available</h1>
        <p>{error || "We could not find this parcel request."}</p>
        <Link href="/customer/parcels">Back to my parcels</Link>
      </main>
    );

  const terminal = terminalParcelStatus(parcel.status);
  return (
    <main className="parcel-tracking-page">
      <header className="parcel-tracking-head">
        <div>
          <Link href="/customer/parcels"><ArrowLeft /> My parcel deliveries</Link>
          <span className="catalog-kicker">{parcel.referenceNumber}</span>
          <h1>{parcelStatusLabel(parcel.status)}</h1>
          <p>Created {formatKigaliDateTime(parcel.createdAt)}</p>
        </div>
        <div>
          <span className={`parcel-live-state ${refreshing ? "refreshing" : ""}`}>
            <RefreshCw /> {terminal ? "Final status" : refreshing ? "Updating…" : "Live updates"}
          </span>
          {customerCanCancelParcel(parcel.status) && (
            <button type="button" onClick={cancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel request"}
            </button>
          )}
        </div>
      </header>
      {error && <p className="parcel-form-error">{error}</p>}

      <div className="parcel-tracking-layout">
        <div>
          <section className="parcel-tracking-map-card">
            <header>
              <div><Route /><span><b>Parcel route</b><small>OpenStreetMap driving route</small></span></div>
              {parcel.remainingDurationS != null && !terminal && (
                <b>{Math.max(1, Math.ceil(parcel.remainingDurationS / 60))} min ETA</b>
              )}
            </header>
            <ParcelRouteMapLoader
              pickup={{ latitude: parcel.pickupLatitude, longitude: parcel.pickupLongitude }}
              delivery={{ latitude: parcel.deliveryLatitude, longitude: parcel.deliveryLongitude }}
              rider={parcel.riderPoint}
              route={parcel.route}
              compact
            />
            <footer>
              <span><Route /><small>{parcel.remainingDistanceM != null && !terminal ? "Remaining" : "Route distance"}</small><b>{((parcel.remainingDistanceM ?? parcel.distanceM) / 1000).toFixed(1)} km</b></span>
              <span><Clock3 /><small>Travel estimate</small><b>{Math.max(1, Math.ceil((parcel.remainingDurationS ?? parcel.estimatedDurationS) / 60))} min</b></span>
              <span><Bike /><small>Rider</small><b>{parcel.assignedRider?.name ?? "Waiting for assignment"}</b></span>
            </footer>
          </section>

          <section className="parcel-timeline-card">
            <h2>Delivery progress</h2>
            {terminal && parcel.status !== "DELIVERED" ? (
              <div className="parcel-terminal-message"><Package /><div><b>{parcelStatusLabel(parcel.status)}</b><p>This parcel will not continue through the delivery workflow.</p></div></div>
            ) : (
              <div className="parcel-timeline">
                {PARCEL_STATUS_FLOW.map((status, index) => {
                  const event = parcel.events.find((item) => item.status === status);
                  return (
                    <div key={status} className={`${index < currentStep ? "complete" : ""} ${index === currentStep ? "current" : ""}`}>
                      <span>{index <= currentStep ? <Check /> : index + 1}</span>
                      <div><b>{parcelStatusLabel(status)}</b><small>{event ? formatKigaliDateTime(event.createdAt) : index === currentStep ? "Current status" : "Waiting"}</small>{event?.note && <p>{event.note}</p>}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="parcel-tracking-details">
          <section>
            <h2>Route details</h2>
            <div><span className="parcel-detail-icon pickup"><MapPin /></span><span><small>PICKUP</small><b>{parcel.pickupAddressDetails || parcel.pickupAddress}</b><p>{parcel.pickupAddress}</p></span></div>
            <div><span className="parcel-detail-icon delivery"><MapPin /></span><span><small>DELIVERY</small><b>{parcel.deliveryAddressDetails || parcel.deliveryAddress}</b><p>{parcel.deliveryAddress}</p></span></div>
          </section>
          <section>
            <h2>Parcel details</h2>
            <dl>
              <div><dt>Pickup contact</dt><dd>{parcel.pickupContactName}</dd></div>
              <div><dt>Recipient</dt><dd>{parcel.recipientName}</dd></div>
              <div><dt>Category</dt><dd>{parcel.categoryName}</dd></div>
              <div><dt>Description</dt><dd>{parcel.parcelDescription}</dd></div>
              <div><dt>Size / weight</dt><dd>{parcel.sizeName} · {parcel.estimatedWeightKg} kg</dd></div>
              <div><dt>Fragile</dt><dd>{parcel.fragile ? "Yes" : "No"}</dd></div>
            </dl>
          </section>
          {parcel.assignedRider && !terminal && (
            <section className="parcel-rider-card">
              <Bike />
              <span><small>ASSIGNED RIDER</small><b>{parcel.assignedRider.name}</b><p>{parcel.assignedRider.vehicleType ?? "Karame Bay delivery vehicle"}</p></span>
            </section>
          )}
          {parcel.deliveryConfirmationCode && !terminal && (
            <section className="parcel-code-card">
              <ShieldCheck />
              <small>DELIVERY CONFIRMATION CODE</small>
              <b>{parcel.deliveryConfirmationCode}</b>
              <p>Give this code to the recipient only. The rider needs it at handover.</p>
            </section>
          )}
          <section className="parcel-price-card">
            <h2>Payment</h2>
            <dl>
              <div><dt>Status</dt><dd>{parcel.paymentStatus.toLowerCase().replaceAll("_", " ")}</dd></div>
              <div><dt>Delivery fee</dt><dd>{formatRwf(parcel.deliveryFeeRwf)}</dd></div>
              <div className="total"><dt>Total</dt><dd>{formatRwf(parcel.totalRwf)}</dd></div>
            </dl>
          </section>
          <a
            className="parcel-support-link"
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle /> WhatsApp Karame Bay support
          </a>
        </aside>
      </div>
    </main>
  );
}
