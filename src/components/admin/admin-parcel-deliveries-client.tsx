"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  CreditCard,
  ExternalLink,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { formatRwf } from "@/lib/catalog";
import { formatKigaliDateTime } from "@/lib/date-format";

type Rider = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  riderProfile: {
    riderStatus: string;
    vehicleType: string;
    licensePlate: string | null;
  } | null;
};

type ParcelEvent = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
};

type ParcelProblem = {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

type AdminParcel = {
  id: string;
  referenceNumber: string;
  status: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupAddressDetails: string;
  pickupInstructions: string | null;
  pickupPreference: string;
  scheduledPickupAt: string | null;
  recipientName: string;
  recipientPhone: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryAddress: string;
  deliveryAddressDetails: string;
  deliveryInstructions: string | null;
  categoryName: string;
  parcelDescription: string;
  quantity: number;
  estimatedWeightKg: number;
  sizeName: string;
  fragile: boolean;
  requiresCarefulHandling: boolean;
  declaredValueRwf: number | null;
  distanceM: number;
  estimatedDurationS: number;
  extraFeesRwf: number;
  deliveryFeeRwf: number;
  totalRwf: number;
  riderCurrentLatitude: number | null;
  riderCurrentLongitude: number | null;
  riderLocationUpdatedAt: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  assignedRider: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  payment: { status: string; verifiedAt: string | null } | null;
  events: ParcelEvent[];
  media: { id: string; kind: string; originalName: string | null }[];
  problems: ParcelProblem[];
};

type PricingSummary = {
  version: number;
  active: boolean;
  sizeSurchargeEnabled: boolean;
  weightSurchargeEnabled: boolean;
  fragileSurchargeEnabled: boolean;
  scheduledSurchargeEnabled: boolean;
  updatedAt: string;
} | null;

const labels: Record<string, string> = {
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

const adminNextStatuses: Record<string, string[]> = {
  RIDER_ASSIGNED: ["RIDER_GOING_TO_PICKUP", "FAILED_DELIVERY"],
  RIDER_GOING_TO_PICKUP: ["ARRIVED_AT_PICKUP", "FAILED_DELIVERY"],
  ARRIVED_AT_PICKUP: ["PARCEL_PICKED_UP", "FAILED_DELIVERY"],
  PARCEL_PICKED_UP: ["ON_THE_WAY", "FAILED_DELIVERY"],
  ON_THE_WAY: ["FAILED_DELIVERY"],
};

const terminalStatuses = [
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
  "FAILED_DELIVERY",
];

function statusLabel(status: string) {
  return labels[status] ?? status.replaceAll("_", " ");
}

function paymentLabel(status: string | undefined) {
  return status ? status.replaceAll("_", " ").toLowerCase() : "No payment";
}

function routeUrl(parcel: AdminParcel) {
  const goingToPickup = [
    "RIDER_ASSIGNED",
    "RIDER_GOING_TO_PICKUP",
    "ARRIVED_AT_PICKUP",
  ].includes(parcel.status);
  const originLatitude = parcel.riderCurrentLatitude ?? parcel.pickupLatitude;
  const originLongitude = parcel.riderCurrentLongitude ?? parcel.pickupLongitude;
  const destinationLatitude = goingToPickup
    ? parcel.pickupLatitude
    : parcel.deliveryLatitude;
  const destinationLongitude = goingToPickup
    ? parcel.pickupLongitude
    : parcel.deliveryLongitude;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${originLatitude}%2C${originLongitude}%3B${destinationLatitude}%2C${destinationLongitude}`;
}

function ParcelCard({
  initial,
  riders,
  onChanged,
}: {
  initial: AdminParcel;
  riders: Rider[];
  onChanged: (parcel: AdminParcel) => void;
}) {
  const [parcel, setParcel] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState(
    parcel.assignedRider?.id ?? riders[0]?.id ?? "",
  );
  const [selectedStatus, setSelectedStatus] = useState(
    adminNextStatuses[parcel.status]?.[0] ?? "",
  );

  async function update(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/parcels/${parcel.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update this parcel.");
        return;
      }
      const changed = data.parcel as AdminParcel;
      setParcel(changed);
      setSelectedRiderId(changed.assignedRider?.id ?? riders[0]?.id ?? "");
      setSelectedStatus(adminNextStatuses[changed.status]?.[0] ?? "");
      onChanged(changed);
    } catch {
      setError("Could not update this parcel. Check the connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  function reject() {
    const reason = window.prompt("Why is this parcel being rejected?");
    if (reason?.trim()) void update({ action: "REJECT", reason });
  }

  function cancel() {
    const reason = window.prompt("Why is this parcel being cancelled?");
    if (reason?.trim() && window.confirm(`Cancel ${parcel.referenceNumber}?`))
      void update({ action: "CANCEL", reason });
  }

  function reassign() {
    if (!selectedRiderId) return;
    const reason = window.prompt(
      "Reason for rider reassignment (optional):",
      "Operations reassignment",
    );
    if (reason === null) return;
    void update({
      action: "REASSIGN_RIDER",
      riderId: selectedRiderId,
      reason: reason.trim() || undefined,
    });
  }

  function overrideDelivery() {
    const recipientName = window.prompt("Name of the person who received the parcel:");
    if (!recipientName?.trim()) return;
    const reason = window.prompt(
      "Explain how delivery was verified before overriding the code:",
    );
    if (!reason?.trim()) return;
    if (!window.confirm("Mark this parcel delivered using an administrator override?"))
      return;
    void update({
      action: "OVERRIDE_DELIVERY_CONFIRMATION",
      recipientName,
      reason,
    });
  }

  const activeRiders = riders.filter(
    (rider) => rider.id !== parcel.assignedRider?.id,
  );
  const nextStatuses = adminNextStatuses[parcel.status] ?? [];
  const canCancel = !terminalStatuses.includes(parcel.status);

  useEffect(() => {
    if (!expanded || terminalStatuses.includes(parcel.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/parcels/${parcel.id}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.parcel) return;
        setParcel(data.parcel);
      } catch {}
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [expanded, parcel.id, parcel.status]);

  return (
    <article className="parcel-admin-card">
      <header className="parcel-admin-card-head">
        <div>
          <span className={`parcel-status parcel-status-${parcel.status.toLowerCase()}`}>
            {statusLabel(parcel.status)}
          </span>
          <h2>{parcel.referenceNumber}</h2>
          <p>
            Created {formatKigaliDateTime(parcel.createdAt)} · {parcel.categoryName}
          </p>
        </div>
        <div className="parcel-admin-money">
          <small>{paymentLabel(parcel.payment?.status)}</small>
          <b>{formatRwf(parcel.totalRwf)}</b>
        </div>
      </header>

      <div className="parcel-admin-summary">
        <section>
          <span><MapPin /></span>
          <div>
            <small>PICKUP</small>
            <b>{parcel.pickupAddress}</b>
            <p>{parcel.pickupContactName} · {parcel.pickupPhone}</p>
          </div>
        </section>
        <section>
          <span><PackageCheck /></span>
          <div>
            <small>DELIVER TO</small>
            <b>{parcel.deliveryAddress}</b>
            <p>{parcel.recipientName} · {parcel.recipientPhone}</p>
          </div>
        </section>
        <section>
          <span><Bike /></span>
          <div>
            <small>RIDER</small>
            <b>
              {parcel.assignedRider
                ? `${parcel.assignedRider.firstName} ${parcel.assignedRider.lastName}`
                : "Not assigned"}
            </b>
            <p>{parcel.assignedRider?.phone ?? "Manual assignment required"}</p>
            {parcel.riderLocationUpdatedAt && (
              <p>GPS {formatKigaliDateTime(parcel.riderLocationUpdatedAt)}</p>
            )}
          </div>
        </section>
        <section>
          <span><Clock3 /></span>
          <div>
            <small>ROUTE</small>
            <b>{(parcel.distanceM / 1_000).toFixed(1)} km</b>
            <p>About {Math.max(1, Math.ceil(parcel.estimatedDurationS / 60))} minutes</p>
          </div>
        </section>
      </div>

      {parcel.problems.length > 0 && (
        <div className="parcel-admin-warning">
          <AlertTriangle />
          <span>
            <b>{parcel.problems.length} open delivery problem{parcel.problems.length === 1 ? "" : "s"}</b>
            <small>{parcel.problems[0].category}: {parcel.problems[0].description}</small>
          </span>
        </div>
      )}

      {error && <p className="parcel-admin-error">{error}</p>}

      <div className="parcel-admin-actions">
        {parcel.payment?.status === "PENDING_VERIFICATION" && (
          <button
            type="button"
            className="primary-action"
            disabled={saving}
            onClick={() => {
              if (window.confirm(`Verify ${formatRwf(parcel.totalRwf)} for ${parcel.referenceNumber}?`))
                void update({ action: "VERIFY_PAYMENT" });
            }}
          >
            <CreditCard /> Verify payment
          </button>
        )}
        {parcel.status === "AWAITING_ADMIN_REVIEW" && (
          <>
            <button
              type="button"
              className="primary-action"
              disabled={saving}
              onClick={() => {
                if (window.confirm(`Approve ${parcel.referenceNumber}?`))
                  void update({ action: "APPROVE" });
              }}
            >
              <Check /> Approve request
            </button>
            <button type="button" disabled={saving} onClick={reject}>
              <X /> Reject
            </button>
          </>
        )}
        {parcel.status === "CONFIRMED" && !parcel.assignedRider && (
          <div className="parcel-rider-control">
            <select
              value={selectedRiderId}
              onChange={(event) => setSelectedRiderId(event.target.value)}
              aria-label="Select rider"
            >
              {riders.length ? (
                riders.map((rider) => (
                  <option value={rider.id} key={rider.id}>
                    {rider.firstName} {rider.lastName} · {rider.riderProfile?.riderStatus ?? "OFFLINE"}
                  </option>
                ))
              ) : (
                <option value="">No active riders</option>
              )}
            </select>
            <button
              type="button"
              className="primary-action"
              disabled={saving || !selectedRiderId}
              onClick={() => void update({ action: "ASSIGN_RIDER", riderId: selectedRiderId })}
            >
              <Bike /> Assign rider
            </button>
          </div>
        )}
        {parcel.assignedRider && !terminalStatuses.includes(parcel.status) && (
          <div className="parcel-rider-control">
            <select
              value={selectedRiderId}
              onChange={(event) => setSelectedRiderId(event.target.value)}
              aria-label="Select replacement rider"
            >
              <option value={parcel.assignedRider.id}>
                Current: {parcel.assignedRider.firstName} {parcel.assignedRider.lastName}
              </option>
              {activeRiders.map((rider) => (
                <option value={rider.id} key={rider.id}>
                  {rider.firstName} {rider.lastName} · {rider.riderProfile?.riderStatus ?? "OFFLINE"}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={saving || selectedRiderId === parcel.assignedRider.id}
              onClick={reassign}
            >
              Reassign rider
            </button>
          </div>
        )}
        {nextStatuses.length > 0 && (
          <div className="parcel-rider-control">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              aria-label="Administrator status update"
            >
              {nextStatuses.map((status) => (
                <option value={status} key={status}>{statusLabel(status)}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={saving || !selectedStatus}
              onClick={() => void update({ action: "UPDATE_STATUS", status: selectedStatus })}
            >
              Save status
            </button>
          </div>
        )}
        {parcel.status === "ON_THE_WAY" && (
          <button type="button" disabled={saving} onClick={overrideDelivery}>
            <ShieldCheck /> Delivery override
          </button>
        )}
        {canCancel && (
          <button type="button" className="danger-action" disabled={saving} onClick={cancel}>
            Cancel parcel
          </button>
        )}
        <a href={routeUrl(parcel)} target="_blank" rel="noreferrer">
          <ExternalLink /> Open route
        </a>
        <button type="button" onClick={() => setExpanded((current) => !current)}>
          {expanded ? <ChevronUp /> : <ChevronDown />}
          {expanded ? "Hide details" : "View details"}
        </button>
      </div>

      {expanded && (
        <div className="parcel-admin-details">
          <section>
            <h3><PackageCheck /> Parcel details</h3>
            <dl>
              <div><dt>Description</dt><dd>{parcel.parcelDescription}</dd></div>
              <div><dt>Size</dt><dd>{parcel.sizeName}</dd></div>
              <div><dt>Quantity</dt><dd>{parcel.quantity}</dd></div>
              <div><dt>Estimated weight</dt><dd>{parcel.estimatedWeightKg} kg</dd></div>
              <div><dt>Fragile</dt><dd>{parcel.fragile ? "Yes" : "No"}</dd></div>
              <div><dt>Careful handling</dt><dd>{parcel.requiresCarefulHandling ? "Yes" : "No"}</dd></div>
              <div>
                <dt>Parcel photos</dt>
                <dd>
                  {parcel.media.length
                    ? parcel.media.map((item, index) => (
                        <span key={item.id}>
                          {index > 0 ? " · " : ""}
                          <a
                            href={`/api/parcels/media/${encodeURIComponent(item.id)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View {item.kind.toLowerCase().replaceAll("_", " ")}
                          </a>
                        </span>
                      ))
                    : "Not provided"}
                </dd>
              </div>
              <div><dt>Declared value</dt><dd>{parcel.declaredValueRwf == null ? "Not provided" : formatRwf(parcel.declaredValueRwf)}</dd></div>
            </dl>
          </section>
          <section>
            <h3><UserRound /> Contacts &amp; instructions</h3>
            <dl>
              <div><dt>Customer</dt><dd>{parcel.customer.firstName} {parcel.customer.lastName}</dd></div>
              <div><dt>Customer phone</dt><dd>{parcel.customer.phone}</dd></div>
              <div><dt>Customer email</dt><dd>{parcel.customer.email}</dd></div>
              <div><dt>Pickup details</dt><dd>{parcel.pickupAddressDetails || "None"}</dd></div>
              <div><dt>Pickup instructions</dt><dd>{parcel.pickupInstructions || "None"}</dd></div>
              <div><dt>Delivery details</dt><dd>{parcel.deliveryAddressDetails || "None"}</dd></div>
              <div><dt>Delivery instructions</dt><dd>{parcel.deliveryInstructions || "None"}</dd></div>
            </dl>
          </section>
          <section>
            <h3><CircleDollarSign /> Charges</h3>
            <dl>
              <div><dt>Delivery fee</dt><dd>{formatRwf(parcel.deliveryFeeRwf)}</dd></div>
              <div><dt>Extra charges</dt><dd>{formatRwf(parcel.extraFeesRwf)}</dd></div>
              <div><dt>Total</dt><dd>{formatRwf(parcel.totalRwf)}</dd></div>
              <div><dt>Payment</dt><dd>{paymentLabel(parcel.payment?.status)}</dd></div>
            </dl>
          </section>
          <section>
            <h3><MapPin /> Live rider tracking</h3>
            <dl>
              <div>
                <dt>Rider GPS</dt>
                <dd>
                  {parcel.riderCurrentLatitude != null && parcel.riderCurrentLongitude != null
                    ? `${parcel.riderCurrentLatitude.toFixed(5)}, ${parcel.riderCurrentLongitude.toFixed(5)}`
                    : "Waiting for rider GPS"}
                </dd>
              </div>
              <div>
                <dt>Remaining route</dt>
                <dd>
                  {parcel.remainingDistanceM == null
                    ? "Not available"
                    : `${(parcel.remainingDistanceM / 1_000).toFixed(1)} km`}
                </dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>
                  {parcel.remainingDurationS == null
                    ? "Not available"
                    : `${Math.max(1, Math.ceil(parcel.remainingDurationS / 60))} minutes`}
                </dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  {parcel.riderLocationUpdatedAt
                    ? formatKigaliDateTime(parcel.riderLocationUpdatedAt)
                    : "No live update yet"}
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <h3><Clock3 /> Status history</h3>
            <ol className="parcel-event-list">
              {parcel.events.length ? parcel.events.map((event) => (
                <li key={event.id}>
                  <b>{statusLabel(event.status)}</b>
                  <small>{formatKigaliDateTime(event.createdAt)}</small>
                  {event.note && <p>{event.note}</p>}
                </li>
              )) : <li>No status events yet.</li>}
            </ol>
          </section>
        </div>
      )}
    </article>
  );
}

export function AdminParcelDeliveriesClient({
  initialParcels,
  riders,
  pricing,
}: {
  initialParcels: AdminParcel[];
  riders: Rider[];
  pricing: PricingSummary;
}) {
  const [parcels, setParcels] = useState(initialParcels);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return parcels.filter((parcel) => {
      const matchesStatus = status === "ALL" || parcel.status === status;
      const matchesQuery = !needle || [
        parcel.referenceNumber,
        parcel.customer.firstName,
        parcel.customer.lastName,
        parcel.pickupContactName,
        parcel.recipientName,
        parcel.pickupAddress,
        parcel.deliveryAddress,
        parcel.categoryName,
      ].some((value) => value.toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [parcels, query, status]);

  function changed(parcel: AdminParcel) {
    setParcels((current) =>
      current.map((item) => (item.id === parcel.id ? parcel : item)),
    );
  }

  return (
    <section className="parcel-admin-workspace">
      <div className="parcel-pricing-summary" id="parcel-pricing-summary">
        <span><ShieldCheck /></span>
        <div>
          <small>PARCEL PRICING CONFIGURATION</small>
          <h2>{pricing?.active ? "Pricing is active" : "Pricing needs review"}</h2>
          <p>
            {pricing
              ? `Version ${pricing.version}. Optional size, weight, fragile, and scheduled charges are controlled independently.`
              : "Create the parcel pricing configuration before accepting live bookings."}
          </p>
        </div>
        <Link href="/admin/settings#parcel-pricing">Manage settings</Link>
      </div>

      <div className="parcel-admin-toolbar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reference, contact, address or category"
          />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All parcel statuses</option>
          {Object.entries(labels).map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
        <b>{filtered.length} shown</b>
      </div>

      <div className="parcel-admin-list">
        {filtered.length ? (
          filtered.map((parcel) => (
            <ParcelCard
              initial={parcel}
              riders={riders}
              onChanged={changed}
              key={parcel.id}
            />
          ))
        ) : (
          <div className="parcel-admin-empty">
            <PackageCheck />
            <h2>No parcel deliveries found</h2>
            <p>New parcel requests will appear here after customers submit them.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .parcel-admin-workspace{display:grid;gap:18px;margin-top:24px}.parcel-pricing-summary{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px}.parcel-pricing-summary>span{width:46px;height:46px;border-radius:12px;background:#fff0d5;color:#b96d00;display:grid;place-items:center}.parcel-pricing-summary svg{width:21px}.parcel-pricing-summary small{font-size:9px;font-weight:900;letter-spacing:1.2px;color:#a86400}.parcel-pricing-summary h2{font-size:18px;margin:4px 0}.parcel-pricing-summary p{font-size:11px;color:var(--muted);margin:0}.parcel-pricing-summary a{background:#211910;color:#fff;border-radius:10px;padding:12px 15px;text-decoration:none;font-size:11px;font-weight:800}.parcel-admin-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) 220px auto;gap:10px;align-items:center}.parcel-admin-toolbar label{height:46px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:0 13px;display:flex;align-items:center;gap:9px}.parcel-admin-toolbar label svg{width:17px;color:var(--muted)}.parcel-admin-toolbar input,.parcel-admin-toolbar select{width:100%;border:0;outline:0;background:transparent}.parcel-admin-toolbar>select{height:46px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:0 12px}.parcel-admin-toolbar>b{font-size:11px;color:var(--muted)}.parcel-admin-list{display:grid;gap:14px}.parcel-admin-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:19px;box-shadow:0 10px 28px rgba(36,28,18,.035)}.parcel-admin-card-head{display:flex;justify-content:space-between;gap:16px}.parcel-status{display:inline-flex;border-radius:999px;padding:6px 9px;background:#f0eee9;font-size:8px;font-weight:900;letter-spacing:.7px;text-transform:uppercase}.parcel-status-delivered{background:#e5f3e5;color:#126a32}.parcel-status-cancelled,.parcel-status-rejected,.parcel-status-failed_delivery{background:#fbe8e5;color:#9d2d22}.parcel-status-awaiting_admin_review,.parcel-status-pending_verification{background:#fff0d5;color:#9a5900}.parcel-status-rider_assigned,.parcel-status-rider_going_to_pickup,.parcel-status-arrived_at_pickup,.parcel-status-parcel_picked_up,.parcel-status-on_the_way{background:#e8effb;color:#24549a}.parcel-admin-card h2{font-size:20px;margin:8px 0 3px}.parcel-admin-card-head p{font-size:10px;color:var(--muted);margin:0}.parcel-admin-money{text-align:right;display:flex;flex-direction:column}.parcel-admin-money small{text-transform:capitalize;color:var(--muted);font-size:9px}.parcel-admin-money b{font-size:18px;margin-top:4px}.parcel-admin-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:16px 0}.parcel-admin-summary section{display:flex;gap:9px;background:#f8f7f3;border-radius:11px;padding:12px;min-width:0}.parcel-admin-summary section>span{width:32px;height:32px;border-radius:8px;background:#fff0d5;color:#b96d00;display:grid;place-items:center;flex:none}.parcel-admin-summary svg{width:15px}.parcel-admin-summary div{display:flex;flex-direction:column;min-width:0}.parcel-admin-summary small{font-size:7px;letter-spacing:.9px;font-weight:900;color:var(--muted)}.parcel-admin-summary b{font-size:10px;margin:3px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.parcel-admin-summary p{font-size:8px;color:var(--muted);margin:0}.parcel-admin-warning,.parcel-admin-error{display:flex;align-items:center;gap:9px;border-radius:10px;padding:11px}.parcel-admin-warning{background:#fff4df;color:#8a5200}.parcel-admin-warning svg{width:18px}.parcel-admin-warning span{display:flex;flex-direction:column}.parcel-admin-warning small{margin-top:2px}.parcel-admin-error{background:#fff0ed;color:#a22d21;font-size:10px}.parcel-admin-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);padding-top:13px}.parcel-admin-actions button,.parcel-admin-actions a{min-height:38px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);padding:0 11px;display:inline-flex;align-items:center;gap:6px;font-size:9px;font-weight:800;text-decoration:none}.parcel-admin-actions button svg,.parcel-admin-actions a svg{width:14px}.parcel-admin-actions .primary-action{background:#c48019;border-color:#c48019;color:#fff}.parcel-admin-actions .danger-action{color:#a22d21}.parcel-admin-actions button:disabled{opacity:.45}.parcel-rider-control{display:flex;align-items:center;gap:6px;background:#f7f6f2;border-radius:10px;padding:4px}.parcel-rider-control select{height:32px;border:0;background:transparent;max-width:230px;font-size:9px}.parcel-admin-details{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:15px;padding-top:15px;border-top:1px solid var(--line)}.parcel-admin-details section{background:#faf9f6;border-radius:12px;padding:14px}.parcel-admin-details h3{display:flex;align-items:center;gap:7px;font-size:12px;margin:0 0 11px}.parcel-admin-details h3 svg{width:16px;color:#b96d00}.parcel-admin-details dl{display:grid;gap:7px;margin:0}.parcel-admin-details dl div{display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:9px}.parcel-admin-details dt{color:var(--muted)}.parcel-admin-details dd{margin:0;font-weight:700;overflow-wrap:anywhere}.parcel-event-list{display:grid;gap:8px;list-style:none;padding:0;margin:0}.parcel-event-list li{border-left:2px solid #d3a154;padding-left:9px;display:flex;flex-direction:column}.parcel-event-list b{font-size:9px}.parcel-event-list small{font-size:8px;color:var(--muted);margin-top:2px}.parcel-event-list p{font-size:8px;margin:3px 0 0}.parcel-admin-empty{text-align:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:55px}.parcel-admin-empty svg{color:#c48019}.parcel-admin-empty h2{font-size:18px}.parcel-admin-empty p{font-size:11px;color:var(--muted)}@media(max-width:1000px){.parcel-admin-summary{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.parcel-pricing-summary{grid-template-columns:auto 1fr}.parcel-pricing-summary a{grid-column:1/-1;text-align:center}.parcel-admin-toolbar{grid-template-columns:1fr}.parcel-admin-summary,.parcel-admin-details{grid-template-columns:1fr}.parcel-admin-card-head{align-items:flex-start}.parcel-admin-money b{font-size:14px}.parcel-rider-control{width:100%}.parcel-rider-control select{flex:1;max-width:none}}
      `}</style>
    </section>
  );
}
