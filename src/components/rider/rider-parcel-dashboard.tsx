"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Check,
  CircleDollarSign,
  Clock3,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Route,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { LiveRouteMapLoader } from "@/components/tracking/live-route-map-loader";
import { formatRwf } from "@/lib/catalog";
import { formatKigaliDateTime } from "@/lib/date-format";

type ParcelProblem = {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
};

type RiderParcel = {
  id: string;
  referenceNumber: string;
  status: string;
  pickupContactName: string;
  pickupPhone: string | null;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupAddressDetails: string;
  pickupInstructions: string | null;
  pickupPreference: string;
  scheduledPickupAt: string | null;
  recipientName: string;
  recipientPhone: string | null;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryAddress: string;
  deliveryAddressDetails: string;
  deliveryInstructions: string | null;
  categoryName: string;
  parcelDescription: string;
  quantity: number;
  estimatedWeightKg: number;
  sizeCode: string;
  sizeName: string;
  fragile: boolean;
  requiresCarefulHandling: boolean;
  distanceM: number;
  estimatedDurationS: number;
  deliveryFeeRwf: number;
  totalRwf: number;
  riderCurrentLatitude: number | null;
  riderCurrentLongitude: number | null;
  riderLocationUpdatedAt: string | null;
  riderRoutePhase: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  liveRoute: [number, number][];
  payment: { status: string } | null;
  problems: ParcelProblem[];
  createdAt: string;
  updatedAt: string;
};

type Tab = "active" | "completed" | "closed";
type Point = { latitude: number; longitude: number };

const labels: Record<string, string> = {
  RIDER_ASSIGNED: "Rider Assigned",
  RIDER_GOING_TO_PICKUP: "Going to Pickup",
  ARRIVED_AT_PICKUP: "Arrived at Pickup",
  PARCEL_PICKED_UP: "Parcel Picked Up",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  FAILED_DELIVERY: "Failed Delivery",
};

const nextAction: Record<string, { status: string; label: string }> = {
  RIDER_ASSIGNED: {
    status: "RIDER_GOING_TO_PICKUP",
    label: "Start Going to Pickup",
  },
  RIDER_GOING_TO_PICKUP: {
    status: "ARRIVED_AT_PICKUP",
    label: "Arrived at Pickup",
  },
  ARRIVED_AT_PICKUP: {
    status: "PARCEL_PICKED_UP",
    label: "Confirm Parcel Picked Up",
  },
  PARCEL_PICKED_UP: { status: "ON_THE_WAY", label: "Start Delivery" },
};

const pickupStatuses = [
  "RIDER_ASSIGNED",
  "RIDER_GOING_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
];
const MIN_SEND_INTERVAL_MS = 25_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const MIN_MOVEMENT_METERS = 30;

function statusLabel(status: string) {
  return labels[status] ?? status.replaceAll("_", " ");
}

function movementDistance(a: Point, b: Point) {
  const radius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

function NavigationPanel({
  parcel,
  onLocation,
}: {
  parcel: RiderParcel;
  onLocation: (update: Partial<RiderParcel>) => void;
}) {
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState("");
  const [point, setPoint] = useState<Point | null>(
    parcel.riderCurrentLatitude != null && parcel.riderCurrentLongitude != null
      ? {
          latitude: parcel.riderCurrentLatitude,
          longitude: parcel.riderCurrentLongitude,
        }
      : null,
  );
  const [route, setRoute] = useState(parcel.liveRoute);
  const [phase, setPhase] = useState(parcel.riderRoutePhase);
  const [remainingDistanceM, setRemainingDistanceM] = useState(
    parcel.remainingDistanceM,
  );
  const [remainingDurationS, setRemainingDurationS] = useState(
    parcel.remainingDurationS,
  );
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const lastSentPoint = useRef<Point | null>(null);

  const pickup = useMemo(
    () => ({
      latitude: parcel.pickupLatitude,
      longitude: parcel.pickupLongitude,
    }),
    [parcel.pickupLatitude, parcel.pickupLongitude],
  );
  const delivery = useMemo(
    () => ({
      latitude: parcel.deliveryLatitude,
      longitude: parcel.deliveryLongitude,
    }),
    [parcel.deliveryLatitude, parcel.deliveryLongitude],
  );
  const destination = pickupStatuses.includes(parcel.status) ? pickup : delivery;
  const destinationLabel = pickupStatuses.includes(parcel.status)
    ? "pickup"
    : "recipient";
  const encoded = `${destination.latitude},${destination.longitude}`;

  const publish = useCallback(
    async (position: GeolocationPosition, force = false) => {
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setPoint(current);
      const now = Date.now();
      const elapsed = now - lastSentAt.current;
      const moved = lastSentPoint.current
        ? movementDistance(lastSentPoint.current, current)
        : Number.POSITIVE_INFINITY;
      if (
        !force &&
        elapsed < HEARTBEAT_INTERVAL_MS &&
        (elapsed < MIN_SEND_INTERVAL_MS || moved < MIN_MOVEMENT_METERS)
      )
        return;
      try {
        const response = await fetch(
          `/api/rider/parcels/${parcel.id}/location`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...current,
              accuracyM: Number.isFinite(position.coords.accuracy)
                ? position.coords.accuracy
                : null,
              headingDegrees: Number.isFinite(position.coords.heading)
                ? position.coords.heading
                : null,
              speedMps: Number.isFinite(position.coords.speed)
                ? position.coords.speed
                : null,
            }),
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(data.error ?? "Could not share the live GPS location.");
          return;
        }
        lastSentAt.current = now;
        lastSentPoint.current = current;
        setRoute(data.route ?? []);
        setPhase(data.phase);
        setRemainingDistanceM(data.remainingDistanceM);
        setRemainingDurationS(data.remainingDurationS);
        setMessage(data.warning ?? `Live route to ${destinationLabel} updated.`);
        onLocation({
          riderCurrentLatitude: current.latitude,
          riderCurrentLongitude: current.longitude,
          riderLocationUpdatedAt: data.location.updatedAt,
          riderRoutePhase: data.phase,
          remainingDistanceM: data.remainingDistanceM,
          remainingDurationS: data.remainingDurationS,
          liveRoute: data.route,
        });
      } catch {
        setMessage("Location update failed. Check the connection and GPS permission.");
      }
    },
    [destinationLabel, onLocation, parcel.id],
  );

  function startTracking() {
    if (!navigator.geolocation) {
      setMessage("GPS is not supported by this device.");
      return;
    }
    if (watchId.current != null) return;
    setMessage("Waiting for GPS permission…");
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setTracking(true);
        void publish(position);
      },
      (error) => {
        setTracking(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission is required for live parcel tracking."
            : "GPS is unavailable. Check the device location settings.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
  }

  function stopTracking() {
    if (watchId.current != null)
      navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
    setMessage("Live GPS paused.");
  }

  useEffect(
    () => () => {
      if (watchId.current != null)
        navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return (
    <section className="parcel-rider-navigation">
      <header>
        <div>
          <span className={`rider-live-dot ${tracking ? "active" : ""}`} />
          <span>
            <b>Navigation to {destinationLabel}</b>
            <small>{tracking ? "Live GPS is sharing" : "GPS sharing is paused"}</small>
          </span>
        </div>
        <button type="button" onClick={tracking ? stopTracking : startTracking}>
          <LocateFixed /> {tracking ? "Pause GPS" : "Start live GPS"}
        </button>
      </header>
      <LiveRouteMapLoader
        store={pickup}
        customer={delivery}
        rider={point}
        route={route}
        phase={phase ?? (pickupStatuses.includes(parcel.status) ? "PICKUP" : "DELIVERY")}
      />
      <div className="parcel-rider-nav-stats">
        <span><Route /><small>Remaining</small><b>{remainingDistanceM == null ? "—" : `${(remainingDistanceM / 1_000).toFixed(1)} km`}</b></span>
        <span><Clock3 /><small>ETA</small><b>{remainingDurationS == null ? "—" : `${Math.max(1, Math.ceil(remainingDurationS / 60))} min`}</b></span>
        <span><Navigation /><small>Route phase</small><b>{destinationLabel}</b></span>
      </div>
      <div className="parcel-rider-map-links">
        <a href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${point?.latitude ?? destination.latitude}%2C${point?.longitude ?? destination.longitude}%3B${destination.latitude}%2C${destination.longitude}`} target="_blank" rel="noreferrer"><Map /> OpenStreetMap</a>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`} target="_blank" rel="noreferrer"><Map /> Google Maps</a>
        <a href={`https://waze.com/ul?ll=${encoded}&navigate=yes`} target="_blank" rel="noreferrer"><Navigation /> Waze</a>
        <a href={`https://maps.apple.com/?daddr=${encoded}&dirflg=d`} target="_blank" rel="noreferrer"><Smartphone /> Apple Maps</a>
      </div>
      {message && <p>{message}</p>}
    </section>
  );
}

function ParcelCard({
  initial,
  onChanged,
}: {
  initial: RiderParcel;
  onChanged: (parcel: RiderParcel) => void;
}) {
  const [parcel, setParcel] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recipientName, setRecipientName] = useState(parcel.recipientName);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [pickupPhoto, setPickupPhoto] = useState<File | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [showProblem, setShowProblem] = useState(false);
  const [problemCategory, setProblemCategory] = useState("Recipient unavailable");
  const [problemDescription, setProblemDescription] = useState("");
  const next = nextAction[parcel.status];

  async function update(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/rider/parcels/${parcel.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update this parcel.");
        return;
      }
      if (data.parcel) {
        setParcel(data.parcel);
        onChanged(data.parcel);
      }
      if (body.action === "REPORT_PROBLEM") {
        setProblemDescription("");
        setShowProblem(false);
      }
    } catch {
      setError("Could not update this parcel. Check the connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadHandoverPhoto(
    kind: "PICKUP_PHOTO" | "DELIVERY_PHOTO",
    photo: File | null,
  ) {
    if (!photo) return true;
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("photo", photo);
    const response = await fetch(`/api/rider/parcels/${parcel.id}/media`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not upload the handover photo.");
      return false;
    }
    return true;
  }

  async function advance() {
    if (!next) return;
    setSaving(true);
    setError("");
    try {
      if (
        next.status === "PARCEL_PICKED_UP" &&
        !(await uploadHandoverPhoto("PICKUP_PHOTO", pickupPhoto))
      )
        return;
      if (next.status === "PARCEL_PICKED_UP") setPickupPhoto(null);
    } finally {
      setSaving(false);
    }
    await update({ action: "UPDATE_STATUS", status: next.status });
  }

  async function confirmDelivered() {
    setSaving(true);
    setError("");
    try {
      if (!(await uploadHandoverPhoto("DELIVERY_PHOTO", deliveryPhoto))) return;
      setDeliveryPhoto(null);
    } finally {
      setSaving(false);
    }
    await update({
      action: "UPDATE_STATUS",
      status: "DELIVERED",
      confirmationCode,
      recipientName,
    });
  }

  function submitProblem() {
    if (problemDescription.trim().length < 5) {
      setError("Describe the delivery problem before submitting it.");
      return;
    }
    void update({
      action: "REPORT_PROBLEM",
      category: problemCategory,
      description: problemDescription,
    });
  }

  return (
    <article className="parcel-rider-card">
      <header>
        <div>
          <span className="parcel-delivery-label"><PackageCheck /> Parcel Delivery</span>
          <h2>{parcel.referenceNumber}</h2>
          <p>{statusLabel(parcel.status)} · {formatKigaliDateTime(parcel.createdAt)}</p>
        </div>
        <div><small>DELIVERY EARNING</small><b>{formatRwf(parcel.deliveryFeeRwf)}</b></div>
      </header>

      <div className="parcel-rider-route">
        <section>
          <span><MapPin /></span>
          <div>
            <small>PICKUP</small>
            <b>{parcel.pickupAddress}</b>
            <p>{parcel.pickupAddressDetails || "No extra address details"}</p>
            <strong>{parcel.pickupContactName}</strong>
            {parcel.pickupPhone ? <a href={`tel:${parcel.pickupPhone}`}><Phone /> {parcel.pickupPhone}</a> : <em>Contact hidden after assignment closes.</em>}
          </div>
        </section>
        <i />
        <section>
          <span><Navigation /></span>
          <div>
            <small>RECIPIENT</small>
            <b>{parcel.deliveryAddress}</b>
            <p>{parcel.deliveryAddressDetails || "No extra address details"}</p>
            <strong>{parcel.recipientName}</strong>
            {parcel.recipientPhone ? <a href={`tel:${parcel.recipientPhone}`}><Phone /> {parcel.recipientPhone}</a> : <em>Contact hidden after assignment closes.</em>}
          </div>
        </section>
      </div>

      <div className="parcel-rider-info">
        <section><small>PARCEL</small><b>{parcel.categoryName} · {parcel.sizeName}</b><p>{parcel.parcelDescription}</p></section>
        <section><small>HANDLING</small><b>{parcel.estimatedWeightKg} kg · {parcel.quantity} item{parcel.quantity === 1 ? "" : "s"}</b><p>{parcel.fragile ? "Fragile" : "Not marked fragile"}{parcel.requiresCarefulHandling ? " · Careful handling" : ""}</p></section>
        <section><small>INSTRUCTIONS</small><b>Pickup</b><p>{parcel.pickupInstructions || "None"}</p><b>Delivery</b><p>{parcel.deliveryInstructions || "None"}</p></section>
        <section><small>FULL ROUTE</small><b>{(parcel.distanceM / 1_000).toFixed(1)} km</b><p>About {Math.max(1, Math.ceil(parcel.estimatedDurationS / 60))} minutes</p></section>
      </div>

      {parcel.problems.length > 0 && (
        <div className="parcel-rider-existing-problem"><AlertTriangle /><span><b>Problem already reported</b><small>{parcel.problems[0].description}</small></span></div>
      )}

      {!["DELIVERED", "CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(parcel.status) && (
        <NavigationPanel
          parcel={parcel}
          onLocation={(location) => {
            const changed = { ...parcel, ...location };
            setParcel(changed);
            onChanged(changed);
          }}
        />
      )}

      {parcel.status === "ON_THE_WAY" && (
        <section className="parcel-confirmation-box">
          <div><ShieldCheck /><span><b>Delivery handover</b><small>The recipient must provide the private confirmation code.</small></span></div>
          <label>Recipient name<input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></label>
          <label>Confirmation code<input value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="4 or 6 digits" /></label>
          <label>Delivery photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDeliveryPhoto(event.target.files?.[0] ?? null)} /></label>
          <button type="button" disabled={saving || confirmationCode.length < 4 || recipientName.trim().length < 2} onClick={() => void confirmDelivered()}><Check /> Confirm Delivered</button>
        </section>
      )}

      {parcel.status === "ARRIVED_AT_PICKUP" && (
        <section className="parcel-handover-photo">
          <PackageCheck />
          <label>
            Pickup photo (optional)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPickupPhoto(event.target.files?.[0] ?? null)} />
          </label>
        </section>
      )}

      {showProblem && (
        <section className="parcel-problem-form">
          <label>Problem type<select value={problemCategory} onChange={(event) => setProblemCategory(event.target.value)}><option>Recipient unavailable</option><option>Pickup contact unavailable</option><option>Unsafe parcel</option><option>Vehicle capacity issue</option><option>Address problem</option><option>Parcel damaged</option><option>Other</option></select></label>
          <label>What happened?<textarea value={problemDescription} onChange={(event) => setProblemDescription(event.target.value)} rows={3} placeholder="Give the administrator enough detail to help." /></label>
          <div><button type="button" onClick={() => setShowProblem(false)}>Close</button><button type="button" disabled={saving} onClick={submitProblem}>Report problem</button></div>
        </section>
      )}

      {error && <p className="parcel-rider-error">{error}</p>}
      <footer>
        {next && <button type="button" className="parcel-rider-primary" disabled={saving} onClick={() => void advance()}><Check /> {next.label}<ArrowRight /></button>}
        {!next && parcel.status !== "ON_THE_WAY" && <span className="parcel-rider-closed"><PackageCheck /> {statusLabel(parcel.status)}</span>}
        {!terminalStatusesForUi.includes(parcel.status) && <button type="button" onClick={() => setShowProblem((current) => !current)}><AlertTriangle /> Report Delivery Problem</button>}
      </footer>
    </article>
  );
}

const terminalStatusesForUi = ["DELIVERED", "CANCELLED", "REJECTED", "FAILED_DELIVERY"];

export function RiderParcelDashboard({
  riderName,
  initialActive,
  initialCompleted,
  initialClosed,
  initialEarningsRwf,
}: {
  riderName: string;
  initialActive: RiderParcel[];
  initialCompleted: RiderParcel[];
  initialClosed: RiderParcel[];
  initialEarningsRwf: number;
}) {
  const [tab, setTab] = useState<Tab>(initialActive.length ? "active" : "completed");
  const [active, setActive] = useState(initialActive);
  const [completed, setCompleted] = useState(initialCompleted);
  const [closed, setClosed] = useState(initialClosed);
  const [earnings, setEarnings] = useState(initialEarningsRwf);

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        const response = await fetch("/api/rider/parcels", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!mounted) return;
        setActive(data.active ?? []);
        setCompleted(data.completed ?? []);
        setClosed(data.closed ?? []);
        setEarnings(data.earningsRwf ?? 0);
      } catch {}
    }
    const timer = window.setInterval(refresh, 10_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  function changed(parcel: RiderParcel) {
    const without = (items: RiderParcel[]) => items.filter((item) => item.id !== parcel.id);
    setActive((current) => terminalStatusesForUi.includes(parcel.status) ? without(current) : [parcel, ...without(current)]);
    setCompleted((current) => parcel.status === "DELIVERED" ? [parcel, ...without(current)] : without(current));
    setClosed((current) => ["CANCELLED", "REJECTED", "FAILED_DELIVERY"].includes(parcel.status) ? [parcel, ...without(current)] : without(current));
  }

  const rows = tab === "active" ? active : tab === "completed" ? completed : closed;
  return (
    <main className="parcel-rider-page">
      <header className="parcel-rider-page-head">
        <div><span className="catalog-kicker">KARAME BAY RIDER</span><h1>Parcel deliveries</h1><p>Welcome, {riderName}. Only parcels assigned by an administrator appear here.</p></div>
        <div><Link href="/rider">Food &amp; market deliveries</Link><span><CircleDollarSign /><small>PARCEL EARNINGS</small><b>{formatRwf(earnings)}</b></span></div>
      </header>
      <nav className="parcel-rider-tabs">
        <button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active <em>{active.length}</em></button>
        <button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>Completed <em>{completed.length}</em></button>
        <button className={tab === "closed" ? "active" : ""} onClick={() => setTab("closed")}>Closed <em>{closed.length}</em></button>
      </nav>
      <section className="parcel-rider-list">
        {rows.length ? rows.map((parcel) => <ParcelCard initial={parcel} onChanged={changed} key={parcel.id} />) : <div className="parcel-rider-empty"><Bike /><h2>No {tab} parcel deliveries</h2><p>Assigned parcel work will appear here automatically.</p></div>}
      </section>
      <style jsx global>{`
        .parcel-rider-page{min-height:100vh;background:#f4f5f1;padding:34px max(3%,calc((100% - 1200px)/2)) 100px}.parcel-rider-page-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.parcel-rider-page-head h1{font-size:31px;margin:6px 0}.parcel-rider-page-head p{font-size:10px;color:var(--muted);margin:0}.parcel-rider-page-head>div:last-child{display:flex;align-items:center;gap:9px}.parcel-rider-page-head a{height:42px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:0 13px;display:flex;align-items:center;color:var(--ink);text-decoration:none;font-size:9px;font-weight:900}.parcel-rider-page-head>div:last-child>span{display:grid;grid-template-columns:24px 1fr;background:#211910;color:#fff;border-radius:10px;padding:9px 13px}.parcel-rider-page-head>div:last-child svg{grid-row:1/3;width:16px;color:#dc991f}.parcel-rider-page-head>div:last-child small{font-size:6px;color:#bdb3a4}.parcel-rider-page-head>div:last-child b{font-size:10px}.parcel-rider-tabs{display:flex;gap:6px;margin:24px 0 14px}.parcel-rider-tabs button{height:40px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:0 14px;font-size:9px;font-weight:900}.parcel-rider-tabs button.active{background:#c48019;border-color:#c48019;color:#fff}.parcel-rider-tabs em{font-style:normal;margin-left:5px}.parcel-rider-list{display:grid;gap:14px}.parcel-rider-card{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}.parcel-rider-card>header{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)}.parcel-delivery-label{display:inline-flex;align-items:center;gap:5px;color:#a45f00;font-size:8px;font-weight:900;text-transform:uppercase}.parcel-delivery-label svg{width:14px}.parcel-rider-card h2{font-size:18px;margin:6px 0 2px}.parcel-rider-card>header p{font-size:8px;color:var(--muted);margin:0}.parcel-rider-card>header>div:last-child{display:flex;flex-direction:column;text-align:right}.parcel-rider-card>header>div:last-child small{font-size:6px;color:var(--muted)}.parcel-rider-card>header>div:last-child b{font-size:14px;margin-top:4px}.parcel-rider-route{display:grid;grid-template-columns:1fr 70px 1fr;align-items:center;padding:18px}.parcel-rider-route section{display:flex;gap:10px}.parcel-rider-route section>span{width:38px;height:38px;border-radius:9px;background:#fff0d5;color:#b66f0d;display:grid;place-items:center;flex:none}.parcel-rider-route section>span svg{width:17px}.parcel-rider-route section>div{display:flex;flex-direction:column}.parcel-rider-route small{font-size:6px;color:var(--muted);font-weight:900;letter-spacing:.7px}.parcel-rider-route b{font-size:10px;margin:2px 0}.parcel-rider-route p,.parcel-rider-route em{font-size:7px;color:var(--muted);margin:0;font-style:normal}.parcel-rider-route strong{font-size:8px;margin-top:5px}.parcel-rider-route a{color:#a45f00;font-size:8px;display:flex;align-items:center;gap:4px;margin-top:3px}.parcel-rider-route a svg{width:11px}.parcel-rider-route>i{height:2px;background:repeating-linear-gradient(90deg,#c48019 0 5px,transparent 5px 9px)}.parcel-rider-info{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#f8f7f3;padding:13px 18px}.parcel-rider-info section{background:#fff;border-radius:9px;padding:10px;display:flex;flex-direction:column}.parcel-rider-info small{font-size:6px;color:var(--muted);font-weight:900}.parcel-rider-info b{font-size:8px;margin:3px 0}.parcel-rider-info p{font-size:7px;color:var(--muted);margin:1px 0}.parcel-rider-navigation{margin:14px 18px;border:1px solid var(--line);border-radius:14px;overflow:hidden}.parcel-rider-navigation>header{display:flex;justify-content:space-between;align-items:center;padding:11px 13px}.parcel-rider-navigation>header>div{display:flex;align-items:center;gap:8px}.parcel-rider-navigation>header>div>span:last-child{display:flex;flex-direction:column}.parcel-rider-navigation>header b{font-size:9px}.parcel-rider-navigation>header small{font-size:7px;color:var(--muted)}.parcel-rider-navigation>header button{border:0;border-radius:8px;background:#c48019;color:#fff;height:34px;padding:0 11px;font-size:8px;font-weight:900;display:flex;align-items:center;gap:5px}.parcel-rider-navigation>header button svg{width:14px}.parcel-rider-nav-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:11px 13px}.parcel-rider-nav-stats span{display:grid;grid-template-columns:20px 1fr;background:#f7f5f0;border-radius:8px;padding:8px}.parcel-rider-nav-stats svg{width:13px;color:#b66f0d;grid-row:1/3}.parcel-rider-nav-stats small{font-size:6px;color:var(--muted)}.parcel-rider-nav-stats b{font-size:8px;text-transform:capitalize}.parcel-rider-map-links{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 13px 11px}.parcel-rider-map-links a{height:34px;border:1px solid var(--line);border-radius:8px;color:var(--ink);text-decoration:none;display:flex;align-items:center;justify-content:center;gap:5px;font-size:7px;font-weight:900}.parcel-rider-map-links svg{width:12px;color:#b66f0d}.parcel-rider-navigation>p{font-size:7px;color:var(--muted);background:#f6f7f3;margin:0;padding:8px 13px}.parcel-confirmation-box,.parcel-problem-form{margin:14px 18px;padding:14px;border-radius:12px;background:#fff8e9;border:1px solid #efd8af;display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}.parcel-confirmation-box>div{grid-column:1/-1;display:flex;align-items:center;gap:8px}.parcel-confirmation-box>div svg{color:#a45f00}.parcel-confirmation-box>div span{display:flex;flex-direction:column}.parcel-confirmation-box b{font-size:10px}.parcel-confirmation-box small{font-size:7px;color:var(--muted)}.parcel-confirmation-box label,.parcel-problem-form label{font-size:7px;color:var(--muted);font-weight:800;display:flex;flex-direction:column;gap:5px}.parcel-confirmation-box input,.parcel-problem-form select,.parcel-problem-form textarea{border:1px solid var(--line);border-radius:8px;background:#fff;padding:9px;font:inherit;color:var(--ink)}.parcel-confirmation-box button,.parcel-problem-form button{height:36px;border:0;border-radius:8px;background:#c48019;color:#fff;font-size:8px;font-weight:900;padding:0 13px}.parcel-problem-form{grid-template-columns:240px 1fr}.parcel-problem-form>div{grid-column:1/-1;display:flex;justify-content:flex-end;gap:6px}.parcel-problem-form>div button:first-child{background:#fff;color:var(--ink);border:1px solid var(--line)}.parcel-rider-existing-problem{display:flex;gap:8px;align-items:center;margin:12px 18px;background:#fff1dd;color:#855100;border-radius:9px;padding:10px}.parcel-rider-existing-problem svg{width:17px}.parcel-rider-existing-problem span{display:flex;flex-direction:column}.parcel-rider-existing-problem b{font-size:8px}.parcel-rider-existing-problem small{font-size:7px;margin-top:2px}.parcel-rider-error{margin:12px 18px;background:#fbe8e4;color:#9d2f24;border-radius:9px;padding:10px;font-size:8px}.parcel-rider-card>footer{display:flex;justify-content:flex-end;gap:7px;border-top:1px solid var(--line);padding:11px 18px}.parcel-rider-card>footer button,.parcel-rider-closed{height:37px;border:1px solid var(--line);background:#fff;border-radius:8px;padding:0 12px;display:flex;align-items:center;gap:5px;font-size:8px;font-weight:900}.parcel-rider-card>footer button svg,.parcel-rider-closed svg{width:13px}.parcel-rider-card>footer .parcel-rider-primary{background:#c48019;border-color:#c48019;color:#fff}.parcel-rider-closed{color:var(--muted)}.parcel-rider-empty{text-align:center;background:#fff;border:1px dashed var(--line);border-radius:14px;padding:60px}.parcel-rider-empty svg{width:34px;color:#c48019}.parcel-rider-empty h2{font-size:18px}.parcel-rider-empty p{font-size:9px;color:var(--muted)}@media(max-width:850px){.parcel-rider-info{grid-template-columns:1fr 1fr}.parcel-rider-map-links{grid-template-columns:1fr 1fr}}@media(max-width:600px){.parcel-rider-page{padding:24px 12px 80px}.parcel-rider-page-head{flex-direction:column}.parcel-rider-page-head>div:last-child{width:100%}.parcel-rider-page-head a{flex:1;justify-content:center}.parcel-rider-tabs{overflow:auto}.parcel-rider-route{grid-template-columns:1fr}.parcel-rider-route>i{height:30px;width:2px;margin-left:18px;background:repeating-linear-gradient(0deg,#c48019 0 5px,transparent 5px 9px)}.parcel-rider-info{grid-template-columns:1fr}.parcel-rider-navigation{margin:10px}.parcel-rider-navigation>header{align-items:flex-start;flex-direction:column;gap:8px}.parcel-rider-navigation>header button{width:100%;justify-content:center}.parcel-rider-nav-stats{grid-template-columns:1fr 1fr 1fr}.parcel-rider-map-links{grid-template-columns:1fr}.parcel-confirmation-box,.parcel-problem-form{grid-template-columns:1fr;margin:10px}.parcel-confirmation-box>div,.parcel-problem-form>div{grid-column:1}.parcel-rider-card>footer{flex-direction:column}.parcel-rider-card>footer button{justify-content:center}}
      `}</style>
      <style jsx global>{`
        .parcel-handover-photo {
          margin: 14px 18px;
          padding: 12px 14px;
          border: 1px solid #efd8af;
          border-radius: 12px;
          background: #fff8e9;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .parcel-handover-photo > svg {
          width: 20px;
          color: #a45f00;
          flex: none;
        }
        .parcel-handover-photo label {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--ink);
          font-size: 8px;
          font-weight: 900;
        }
        .parcel-handover-photo input,
        .parcel-confirmation-box input[type="file"] {
          max-width: 240px;
          cursor: pointer;
        }
        .parcel-confirmation-box {
          grid-template-columns: 1fr 1fr 1.2fr auto;
        }
        @media (max-width: 850px) {
          .parcel-confirmation-box {
            grid-template-columns: 1fr 1fr;
          }
          .parcel-confirmation-box > button {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 600px) {
          .parcel-handover-photo {
            margin: 10px;
            align-items: flex-start;
          }
          .parcel-handover-photo label {
            align-items: flex-start;
            flex-direction: column;
          }
          .parcel-handover-photo input,
          .parcel-confirmation-box input[type="file"] {
            width: 100%;
            max-width: none;
          }
          .parcel-confirmation-box {
            grid-template-columns: 1fr;
          }
          .parcel-confirmation-box > button {
            grid-column: 1;
          }
        }
      `}</style>
    </main>
  );
}
