"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  ArrowRight,
  Bike,
  Check,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import { formatRwf } from "@/lib/money";
import { formatKigaliDateTime } from "@/lib/date-format";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import {
  RiderNavigationPanel,
  type NavigationDelivery,
} from "@/components/rider/rider-navigation-panel";

type Available = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryFeeRwf: number;
  drivingDistanceM: number;
  estimatedDurationS: number;
  createdAt: string;
  store: { name: string; latitude: number; longitude: number };
  _count: { items: number };
};
type Delivery = NavigationDelivery & {
  id: string;
  orderNumber: string;
  status: string;
  assignmentStatus: string | null;
  deliveryFeeRwf: number;
  drivingDistanceM: number;
  estimatedDurationS: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryAddress: string;
  grandTotalRwf: number;
  createdAt: string;
  store: {
    name: string;
    latitude: number;
    longitude: number;
    phone: string | null;
  };
  customer: { firstName: string; lastName: string; phone: string | null };
  payment: { status: string } | null;
  items: { id: string; productName: string; quantity: number }[];
};
type RiderProfile = {
  userId: string;
  photoUrl: string | null;
  vehicleType: string;
  licensePlate: string | null;
  riderStatus: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentLocationLabel: string | null;
  onlineSinceAt: string | null;
  lastSeenAt: string | null;
  rating: number;
  averageDeliveryMinutes: number;
  averagePickupMinutes: number;
  completedDeliveriesCount: number;
  cancelledDeliveriesCount: number;
  totalEarningsRwf: number;
};
type Tab = "active" | "available" | "completed";
const isAcceptedActiveDelivery = (delivery: Delivery) =>
  delivery.status === "READY_FOR_PICKUP"
    ? delivery.assignmentStatus === "ACKNOWLEDGED"
    : ["PICKED_UP", "ON_THE_WAY"].includes(delivery.status);
const navigationUrl = (delivery: Delivery) =>
  `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${delivery.store.latitude}%2C${delivery.store.longitude}%3B${delivery.deliveryLatitude}%2C${delivery.deliveryLongitude}`;

function AvailableCard({
  job,
  onAccepted,
}: {
  job: Available;
  onAccepted: (delivery: Delivery) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rider/deliveries/${job.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not accept this delivery.");
        return;
      }
      onAccepted(data.delivery);
    } catch {
      setError("Could not accept this delivery. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <article className="rider-available-card">
      <header>
        <span>
          <Store />
        </span>
        <div>
          <small>PICKUP FROM</small>
          <h2>{job.store.name}</h2>
          <p>{job.orderNumber}</p>
        </div>
      </header>
      <div>
        <span>
          <ShoppingBag />
          <b>{job._count.items}</b>
          <small>items</small>
        </span>
        <span>
          <Navigation />
          <b>{(job.drivingDistanceM / 1000).toFixed(1)} km</b>
          <small>route</small>
        </span>
        <span>
          <Clock3 />
          <b>{Math.ceil(job.estimatedDurationS / 60)} min</b>
          <small>travel</small>
        </span>
        <span>
          <CircleDollarSign />
          <b>{formatRwf(job.deliveryFeeRwf)}</b>
          <small>earning</small>
        </span>
      </div>
      {error && <p className="rider-error">{error}</p>}
      <button onClick={accept} disabled={loading}>
        {loading ? <LoaderCircle className="spin" /> : <Bike />}
        Accept delivery
      </button>
    </article>
  );
}

function DeliveryCard({
  initial,
  onChanged,
}: {
  initial: Delivery;
  onChanged: (delivery: Delivery) => void;
}) {
  const [delivery, setDelivery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const next =
    delivery.status === "READY_FOR_PICKUP" &&
    delivery.assignmentStatus === "ACKNOWLEDGED"
      ? { status: "PICKED_UP", label: "Mark Picked Up" }
      : delivery.status === "PICKED_UP"
        ? { status: "ON_THE_WAY", label: "Start Delivery" }
        : delivery.status === "ON_THE_WAY"
          ? { status: "DELIVERED", label: "Mark Delivered" }
          : null;
  async function update() {
    if (!next) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rider/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_STATUS", status: next.status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update this delivery.");
        return;
      }
      setDelivery(data.delivery);
      onChanged(data.delivery);
    } catch {
      setError("Could not update this delivery. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <article className="rider-delivery-card">
      <header>
        <div>
          <span className={`rider-status ${delivery.status.toLowerCase()}`}>
            {orderStatusLabel(delivery.status)}
          </span>
          <b>{delivery.orderNumber}</b>
        </div>
        <span>{paymentStatusLabel(delivery.payment?.status ?? "UNKNOWN")}</span>
      </header>
      <div className="rider-route">
        <div>
          <span>
            <Store />
          </span>
          <div>
            <small>PICKUP</small>
            <b>{delivery.store.name}</b>
            <p>
              {delivery.store.latitude.toFixed(5)},{" "}
              {delivery.store.longitude.toFixed(5)}
            </p>
          </div>
        </div>
        <i />
        <div>
          <span>
            <MapPin />
          </span>
          <div>
            <small>DELIVER TO</small>
            <b>{delivery.deliveryAddress}</b>
            <p>
              {(delivery.drivingDistanceM / 1000).toFixed(1)} km ·{" "}
              {Math.ceil(delivery.estimatedDurationS / 60)} min
            </p>
          </div>
        </div>
      </div>
      <div className="rider-info-grid">
        <section>
          <h3>
            <User /> Customer
          </h3>
          <b>
            {delivery.customer.firstName} {delivery.customer.lastName}
          </b>
          {delivery.customer.phone ? (
            <a href={`tel:${delivery.customer.phone}`}><Phone /> {delivery.customer.phone}</a>
          ) : (
            <small>Contact hidden after delivery completion.</small>
          )}
        </section>
        <section>
          <h3>
            <ShoppingBag /> Items
          </h3>
          {delivery.items.map((item) => (
            <p key={item.id}>
              {item.quantity} × {item.productName}
            </p>
          ))}
        </section>
        <section>
          <h3>
            <CircleDollarSign /> Delivery
          </h3>
          <b>{formatRwf(delivery.deliveryFeeRwf)}</b>
          <small>Order total: {formatRwf(delivery.grandTotalRwf)}</small>
        </section>
      </div>
      {next && (
        <RiderNavigationPanel
          delivery={delivery}
          onUpdate={(update) => {
            const changed = {
              ...delivery,
              riderCurrentLatitude: update.latitude,
              riderCurrentLongitude: update.longitude,
              riderLocationUpdatedAt: update.updatedAt,
              riderRoutePhase: update.phase,
              remainingDistanceM: update.remainingDistanceM,
              remainingDurationS: update.remainingDurationS,
              liveRoute: update.route,
            };
            setDelivery(changed);
            onChanged(changed);
          }}
        />
      )}
      {error && <p className="rider-error">{error}</p>}
      <footer>
        <a href={navigationUrl(delivery)} target="_blank" rel="noreferrer">
          <ExternalLink /> OpenStreetMap route
        </a>
        {next && (
          <button onClick={update} disabled={loading}>
            {loading ? <LoaderCircle className="spin" /> : <Check />}
            {next.label}
            <ArrowRight />
          </button>
        )}
      </footer>
    </article>
  );
}

export function RiderDashboard({
  rider,
  riderName,
  riderProfile,
  initialAvailable,
  initialAssigned,
  earnings,
}: {
  rider: { id: string; email: string; phone: string; firstName: string; lastName: string };
  riderName: string;
  riderProfile: RiderProfile | null;
  initialAvailable: Available[];
  initialAssigned: Delivery[];
  earnings: number;
}) {
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>(
    initialAssigned.some(isAcceptedActiveDelivery)
      ? "active"
      : "available",
  );
  const [available, setAvailable] = useState(initialAvailable);
  const [assigned, setAssigned] = useState(initialAssigned);
  const [totalEarnings, setTotalEarnings] = useState(earnings);
  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    updateTime();
    const timer = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/rider/deliveries", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setAvailable(data.available);
        setAssigned(data.assigned);
        setTotalEarnings(data.earnings);
      } catch {}
    }
    const timer = window.setInterval(refresh, 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  const active = assigned.filter(isAcceptedActiveDelivery);
  const completed = assigned.filter(
    (delivery) => delivery.status === "DELIVERED",
  );
  function accepted(delivery: Delivery) {
    setAvailable((current) => current.filter((job) => job.id !== delivery.id));
    setAssigned((current) =>
      current.some((item) => item.id === delivery.id)
        ? current.map((item) => (item.id === delivery.id ? delivery : item))
        : [delivery, ...current],
    );
    setTab("active");
  }
  function changed(delivery: Delivery) {
    setAssigned((current) =>
      current.map((item) => (item.id === delivery.id ? delivery : item)),
    );
  }
  return (
    <div className="rider-dashboard">
      <header>
        <div>
          <span className="rider-logo">
            <Image
              src="/images/karame-transport-logo.jpeg"
              width={40}
              height={40}
              alt="Karame Bay logo"
            />
          </span>
          <div>
            <b>Karame Bay Rider</b>
            <small>Welcome, {riderName}</small>
          </div>
        </div>
        <nav>
          <button
            className={tab === "active" ? "active" : ""}
            onClick={() => setTab("active")}
          >
            Active <em>{active.length}</em>
          </button>
          <button
            className={tab === "available" ? "active" : ""}
            onClick={() => setTab("available")}
          >
            Assigned <em>{available.length}</em>
          </button>
          <button
            className={tab === "completed" ? "active" : ""}
            onClick={() => setTab("completed")}
          >
            Completed
          </button>
          <Link href="/rider/parcels">Parcel deliveries</Link>
        </nav>
        <div className="rider-earning">
          <CircleDollarSign />
          <span>
            <small>TOTAL EARNINGS</small>
            <b>{formatRwf(totalEarnings)}</b>
          </span>
        </div>
        <NotificationBell />
      </header>
      <main>
        <div className="rider-page-title">
          <span className="catalog-kicker">DELIVERY WORKSPACE</span>
          <h1>
            {tab === "active"
              ? "Active deliveries"
              : tab === "available"
                ? "Assigned deliveries"
                : "Completed deliveries"}
          </h1>
          <p>
            {tab === "available"
              ? "Orders assigned to you and waiting for pickup."
              : tab === "completed"
                ? "Your delivered orders and earnings history."
                : "Pickup and deliver your assigned orders."}
          </p>
        </div>
        <section className="rider-profile-card">
          <div className="rider-profile-avatar">
            {riderProfile?.photoUrl ? (
              <Image
                src={riderProfile.photoUrl}
                width={96}
                height={96}
                alt={`${rider.firstName} ${rider.lastName}`}
                unoptimized
              />
            ) : (
              <span>
                {rider.firstName[0]}
                {rider.lastName[0]}
              </span>
            )}
          </div>
          <div className="rider-profile-copy">
            <span className="catalog-kicker">RIDER PROFILE</span>
            <h2>
              {rider.firstName} {rider.lastName}
            </h2>
            <small>Rider ID: {rider.id}</small>
            <small>Email: {rider.email}</small>
            <small>Phone: {rider.phone}</small>
            <small>Vehicle: {riderProfile?.vehicleType ?? "Motorcycle"}</small>
            <small>
              Plate: {riderProfile?.licensePlate ?? "Not set yet"}
            </small>
          </div>
          <div className="rider-profile-stats">
            <article>
              <small>Current status</small>
              <b>{riderProfile?.riderStatus ?? "OFFLINE"}</b>
            </article>
            <article>
              <small>Active deliveries</small>
              <b>{active.length}</b>
            </article>
            <article>
              <small>Completed deliveries</small>
              <b>{completed.length}</b>
            </article>
            <article>
              <small>Total earnings</small>
              <b>{formatRwf(riderProfile?.totalEarningsRwf ?? totalEarnings)}</b>
            </article>
            <article>
              <small>Online time</small>
              <b>
                {riderProfile?.onlineSinceAt && currentTime !== null
                  ? `${Math.max(
                      1,
                      Math.round(
                        (currentTime - new Date(riderProfile.onlineSinceAt).getTime()) /
                          60000,
                      ),
                    )} min`
                  : "—"}
              </b>
            </article>
            <article>
              <small>Last seen</small>
              <b>
                {riderProfile?.lastSeenAt
                  ? formatKigaliDateTime(riderProfile.lastSeenAt)
                  : "Not yet"}
              </b>
            </article>
          </div>
        </section>
        {tab === "available" && (
          <section className="rider-available-grid">
            {available.length ? (
              available.map((job) => (
                <AvailableCard job={job} onAccepted={accepted} key={job.id} />
              ))
            ) : (
              <div className="rider-empty">
                <Bike />
                <h2>No assigned deliveries</h2>
                <p>Orders will appear here once an admin assigns them to you.</p>
              </div>
            )}
          </section>
        )}
        {tab === "active" && (
          <section className="rider-delivery-list">
            {active.length ? (
              active.map((delivery) => (
                <DeliveryCard
                  initial={delivery}
                  onChanged={changed}
                  key={delivery.id}
                />
              ))
            ) : (
              <div className="rider-empty">
                <PackageCheck />
                <h2>No active deliveries</h2>
                <p>Check the Assigned tab for a waiting delivery.</p>
              </div>
            )}
          </section>
        )}
        {tab === "completed" && (
          <section className="rider-delivery-list">
            {completed.length ? (
              completed.map((delivery) => (
                <DeliveryCard
                  initial={delivery}
                  onChanged={changed}
                  key={delivery.id}
                />
              ))
            ) : (
              <div className="rider-empty">
                <Check />
                <h2>No completed deliveries yet</h2>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

