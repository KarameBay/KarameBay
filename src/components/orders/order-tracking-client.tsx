"use client";

import { useEffect, useState } from "react";
import {
  Bike,
  Check,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Store,
} from "lucide-react";
import { formatRwf } from "@/lib/money";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import { LiveRouteMapLoader } from "@/components/tracking/live-route-map-loader";
import { formatKigaliDateTime, formatKigaliTime } from "@/lib/date-format";

type TrackingOrder = {
  orderNumber: string;
  status: string;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  drivingDistanceM: number;
  estimatedDurationS: number;
  riderCurrentLatitude: number | null;
  riderCurrentLongitude: number | null;
  riderLocationUpdatedAt: string | null;
  riderRoutePhase: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  liveRoute: [number, number][];
  grandTotalRwf: number;
  createdAt: string;
  store: { name: string; latitude: number; longitude: number };
  rider:
    | {
        firstName: string;
        lastName: string;
        phone: string;
        riderProfile: {
          vehicleType: string;
          riderStatus: string;
          currentLocationLabel: string | null;
          currentLatitude: number | null;
          currentLongitude: number | null;
          lastSeenAt: string | null;
        } | null;
      }
    | null;
  payment: { status: string } | null;
  events: {
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
  }[];
};

const FLOW = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
];

export function OrderTrackingClient({ initial }: { initial: TrackingOrder }) {
  const [order, setOrder] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      setRefreshing(true);
      try {
        const response = await fetch(`/api/orders/${initial.orderNumber}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          if (active) setOrder(data.order);
        }
      } finally {
        if (active) setRefreshing(false);
      }
    }
    const timer = window.setInterval(refresh, 8_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [initial.orderNumber]);

  const terminal = ["CANCELLED", "REJECTED"].includes(order.status);
  const current = FLOW.indexOf(order.status);
  const riderPoint =
    order.riderCurrentLatitude != null && order.riderCurrentLongitude != null
      ? {
          latitude: order.riderCurrentLatitude,
          longitude: order.riderCurrentLongitude,
        }
      : null;

  return (
    <main className="tracking-live-page">
      <header>
        <div>
          <span className="catalog-kicker">ORDER {order.orderNumber}</span>
          <h1>
            {terminal
              ? orderStatusLabel(order.status)
              : order.status === "DELIVERED"
                ? "Order delivered"
                : "Your order is in progress"}
          </h1>
          <p>
            Updates appear automatically when the Karame Bay team changes your
            status.
          </p>
        </div>
        <span className={`live-indicator ${refreshing ? "refreshing" : ""}`}>
          <RefreshCw /> {refreshing ? "Checking..." : "Live updates"}
        </span>
      </header>
      <div className="tracking-live-layout">
        <section className="tracking-progress">
          <div className="tracking-store">
            <span>
              <Store />
            </span>
            <div>
              <small>ORDERING FROM</small>
              <b>{order.store.name}</b>
            </div>
          </div>
          {order.rider && riderPoint && !terminal && (
            <section className="tracking-route-card">
              <div className="tracking-route-head">
                <span>
                  <Bike />
                  <b>Rider live route</b>
                </span>
                <small>
                  {order.riderLocationUpdatedAt
                    ? `Updated ${formatKigaliTime(order.riderLocationUpdatedAt)}`
                    : "Waiting for GPS update"}
                </small>
              </div>
              <LiveRouteMapLoader
                store={order.store}
                customer={{
                  latitude: order.deliveryLatitude,
                  longitude: order.deliveryLongitude,
                }}
                rider={riderPoint}
                route={order.liveRoute}
                phase={order.riderRoutePhase}
                compact
              />
              <div className="tracking-route-metrics">
                <span>
                  <small>Remaining distance</small>
                  <b>
                    {order.remainingDistanceM != null
                      ? `${(order.remainingDistanceM / 1000).toFixed(1)} km`
                      : "Calculating…"}
                  </b>
                </span>
                <span>
                  <small>Estimated arrival</small>
                  <b>
                    {order.remainingDurationS != null
                      ? `${Math.max(1, Math.ceil(order.remainingDurationS / 60))} min`
                      : "Calculating…"}
                  </b>
                </span>
                <span>
                  <small>Current route</small>
                  <b>{order.riderRoutePhase === "PICKUP" ? "To pickup" : "To you"}</b>
                </span>
              </div>
            </section>
          )}
          {order.rider && !riderPoint && !terminal && (
            <div className="tracking-location-waiting">
              <MapPin /> Rider assigned. Live location will appear when navigation starts.
            </div>
          )}
          {terminal ? (
            <div className="terminal-status">
              <PackageCheck />
              <h2>{orderStatusLabel(order.status)}</h2>
              <p>This order will not continue through the delivery workflow.</p>
            </div>
          ) : (
            <div className="tracking-steps">
              {FLOW.map((status, index) => {
                const event = order.events.find((item) => item.status === status);
                return (
                  <div
                    className={`${index < current ? "complete" : ""} ${
                      index === current ? "current" : ""
                    }`}
                    key={status}
                  >
                    <span>{index <= current ? <Check /> : index + 1}</span>
                    <div>
                      <b>{orderStatusLabel(status)}</b>
                      <small>
                        {event
                          ? formatKigaliDateTime(event.createdAt)
                          : index === current
                            ? "Current status"
                            : "Waiting"}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <aside className="tracking-details">
          <h2>Order details</h2>
          <div>
            <MapPin />
            <span>
              <small>DELIVERY ADDRESS</small>
              <b>{order.deliveryAddress}</b>
            </span>
          </div>
          <div>
            <Clock3 />
            <span>
              <small>ROUTE ESTIMATE</small>
              <b>
                {(order.drivingDistanceM / 1000).toFixed(1)} km ·{" "}
                {Math.ceil(order.estimatedDurationS / 60)} min
              </b>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <small>PAYMENT</small>
              <b>{paymentStatusLabel(order.payment?.status ?? "UNKNOWN")}</b>
            </span>
          </div>
          <div>
            <Bike />
            <span>
              <small>RIDER ASSIGNED</small>
              <b>
                {order.rider
                  ? `${order.rider.firstName} ${order.rider.lastName}`
                  : "Waiting for admin assignment"}
              </b>
              <small>
                {order.rider
                  ? order.rider.phone
                  : "We'll show the rider here after assignment."}
              </small>
              {order.rider && (
                <>
                  <small>
                    Vehicle: {order.rider.riderProfile?.vehicleType ?? "Motorcycle"}
                  </small>
                  <small>
                    Status: {order.rider.riderProfile?.riderStatus ?? "Unknown"}
                  </small>
                  {order.rider.riderProfile?.currentLocationLabel && (
                    <small>{order.rider.riderProfile.currentLocationLabel}</small>
                  )}
                </>
              )}
            </span>
          </div>
          <div>
            <PackageCheck />
            <span>
              <small>GRAND TOTAL</small>
              <b>{formatRwf(order.grandTotalRwf)}</b>
            </span>
          </div>
          <div className="tracking-events">
            <h3>Latest updates</h3>
            {[...order.events].reverse().slice(0, 4).map((event) => (
              <p key={event.id}>
                <span />
                <b>{orderStatusLabel(event.status)}</b>
                <small>
                  {formatKigaliTime(event.createdAt)}
                </small>
              </p>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
