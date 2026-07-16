"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CreditCard,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Save,
  ShoppingBag,
} from "lucide-react";
import { formatRwf } from "@/lib/catalog";
import { formatKigaliDateTime, formatKigaliTime } from "@/lib/date-format";
import {
  OrderStatus,
  availableOrderStatuses,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-status";
import { LiveRouteMapLoader } from "@/components/tracking/live-route-map-loader";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  itemsSubtotalRwf: number;
  deliveryFeeRwf: number;
  grandTotalRwf: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  riderCurrentLatitude: number | null;
  riderCurrentLongitude: number | null;
  riderLocationUpdatedAt: string | null;
  riderRoutePhase: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  riderRouteJson: string;
  riderAccepted: boolean;
  riderAssignmentStatus: string | null;
  createdAt: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  store: { name: string; latitude: number; longitude: number };
  rider: { firstName: string; lastName: string; phone: string } | null;
  payment: { status: string } | null;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPriceRwf: number;
    lineTotalRwf: number;
  }[];
};

type Rider = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
};

function AdminOrderRow({
  initial,
  riders,
}: {
  initial: AdminOrder;
  riders: Rider[];
}) {
  const [order, setOrder] = useState(initial);
  const [selected, setSelected] = useState<OrderStatus>(
    initial.status as OrderStatus,
  );
  const [selectedRiderId, setSelectedRiderId] = useState(riders[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const riderAssigned = order.rider !== null;
  const riderDeliveryStatus = ["PICKED_UP", "ON_THE_WAY", "DELIVERED"].includes(
    order.status,
  );
  const riderControlsStatus = order.riderAccepted || riderDeliveryStatus;
  const adminStatuses = availableOrderStatuses(order.status).filter(
    (status) => !["PICKED_UP", "ON_THE_WAY", "DELIVERED"].includes(status),
  );

  useEffect(() => {
    if (!open || !riderAssigned) return;
    let active = true;
    async function refreshLocation() {
      try {
        const response = await fetch(`/api/orders/${order.orderNumber}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setOrder((current) => ({
          ...current,
          status: data.order.status,
          riderCurrentLatitude: data.order.riderCurrentLatitude,
          riderCurrentLongitude: data.order.riderCurrentLongitude,
          riderLocationUpdatedAt: data.order.riderLocationUpdatedAt,
          riderRoutePhase: data.order.riderRoutePhase,
          remainingDistanceM: data.order.remainingDistanceM,
          remainingDurationS: data.order.remainingDurationS,
          riderRouteJson: JSON.stringify(data.order.liveRoute ?? []),
        }));
      } catch {}
    }
    void refreshLocation();
    const timer = window.setInterval(refreshLocation, 8_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, order.orderNumber, riderAssigned]);

  async function update(body: object) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Update failed");
        return false;
      }
      setOrder((current) => ({
        ...current,
        status: data.order.status ?? current.status,
        rider: data.order.rider ?? current.rider,
        payment:
          typeof data.order.paymentStatus === "string"
            ? { status: data.order.paymentStatus }
            : current.payment,
      }));
      if (data.order.rider?.id) {
        setSelectedRiderId(data.order.rider.id);
      }
      setSelected(data.order.status as OrderStatus);
      return true;
    } catch {
      setError("Could not update this order. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function verify() {
    if (
      !confirm(
        `Verify the ${formatRwf(order.grandTotalRwf)} MoMo payment for ${order.orderNumber}?`,
      )
    )
      return;
    await update({ action: "VERIFY_PAYMENT" });
  }

  async function assignRider() {
    if (!selectedRiderId) return;
    await update({ action: "ASSIGN_RIDER", riderId: selectedRiderId });
  }

  async function saveStatus() {
    await update({ action: "UPDATE_STATUS", status: selected });
  }

  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            className="order-expand"
            onClick={() => setOpen(!open)}
          >
            <ChevronDown className={open ? "open" : ""} />
          </button>
          <Link href={`/orders/${order.orderNumber}/track`}>
            {order.orderNumber}
          </Link>
          <small>
            {formatKigaliDateTime(order.createdAt)}
          </small>
        </td>
        <td>
          <b>
            {order.customer.firstName} {order.customer.lastName}
          </b>
          <small>{order.customer.email}</small>
          <small>{order.customer.phone}</small>
        </td>
        <td>{order.store.name}</td>
        <td>
          {order.rider ? (
            <>
              <b>
                {order.rider.firstName} {order.rider.lastName}
              </b>
              <small>{order.rider.phone}</small>
              <span
                className={`assignment-acceptance ${order.riderAccepted ? "accepted" : "waiting"}`}
              >
                {order.riderAccepted
                  ? "Accepted by rider"
                  : "Awaiting rider acceptance"}
              </span>
            </>
          ) : order.status === "READY_FOR_PICKUP" ? (
            <div className="assign-rider-inline">
              <span className="unassigned-rider">
                Waiting for rider assignment
              </span>
              <select
                value={selectedRiderId}
                onChange={(event) => setSelectedRiderId(event.target.value)}
              >
                {riders.length ? (
                  riders.map((rider) => (
                    <option value={rider.id} key={rider.id}>
                      {rider.firstName} {rider.lastName}
                    </option>
                  ))
                ) : (
                  <option value="">No active riders</option>
                )}
              </select>
              <button
                type="button"
                className="assign-rider-button"
                onClick={assignRider}
                disabled={saving || !selectedRiderId || !riders.length}
              >
                Assign rider
              </button>
            </div>
          ) : (
            <span className="unassigned-rider">No rider assigned</span>
          )}
        </td>
        <td>
          <button
            type="button"
            className="item-summary"
            onClick={() => setOpen(!open)}
          >
            <ShoppingBag />
            {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
          </button>
        </td>
        <td className="address-cell">
          <MapPin />
          <span>{order.deliveryAddress}</span>
        </td>
        <td>
          <b>{formatRwf(order.deliveryFeeRwf)}</b>
        </td>
        <td>
          <b>{formatRwf(order.grandTotalRwf)}</b>
        </td>
        <td>
          {riderControlsStatus ? (
            <div className="rider-controlled-status">
              <b>Rider controlled</b>
              <small>Delivery updates come from the assigned rider.</small>
            </div>
          ) : (
            <div className="status-editor">
              <select
                value={selected}
                onChange={(event) =>
                  setSelected(event.target.value as OrderStatus)
                }
              >
                {adminStatuses.map((status) => (
                  <option value={status} key={status}>
                    {orderStatusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={saveStatus}
                disabled={saving || selected === order.status}
                title="Save status"
              >
                {saving ? <LoaderCircle className="spin" /> : <Save />}
              </button>
            </div>
          )}
          <span className={`status-chip ${order.status.toLowerCase()}`}>
            {orderStatusLabel(order.status)}
          </span>
        </td>
        <td>
          <span
            className={`payment-chip ${(order.payment?.status ?? "").toLowerCase()}`}
          >
            {paymentStatusLabel(order.payment?.status ?? "Unknown")}
          </span>
          {order.payment?.status === "PENDING_VERIFICATION" && (
            <button
              type="button"
              className="verify-payment"
              onClick={verify}
              disabled={saving}
            >
              <CreditCard /> Verify payment
            </button>
          )}
          {order.payment?.status === "PAID" && (
            <span className="paid-mark">
              <Check /> Verified
            </span>
          )}
          {error && <small className="row-error">{error}</small>}
        </td>
      </tr>
      {open && (
        <tr className="order-details-row">
          <td colSpan={10}>
            <div>
              <section>
                <h3>
                  <PackageCheck /> Items
                </h3>
                {order.items.map((item) => (
                  <p key={item.id}>
                    <span>
                      {item.quantity} × {item.productName}
                      <small>{formatRwf(item.unitPriceRwf)} each</small>
                    </span>
                    <b>{formatRwf(item.lineTotalRwf)}</b>
                  </p>
                ))}
              </section>
              <section>
                <h3>
                  <MapPin /> Delivery
                </h3>
                <p>{order.deliveryAddress}</p>
                <div>
                  <span>Items subtotal</span>
                  <b>{formatRwf(order.itemsSubtotalRwf)}</b>
                </div>
                <div>
                  <span>Delivery fee</span>
                  <b>{formatRwf(order.deliveryFeeRwf)}</b>
                </div>
              </section>
              <section className="admin-live-route">
                <h3>
                  <MapPin /> Rider tracking
                </h3>
                {order.riderCurrentLatitude != null &&
                order.riderCurrentLongitude != null ? (
                  <>
                    <LiveRouteMapLoader
                      store={order.store}
                      customer={{
                        latitude: order.deliveryLatitude,
                        longitude: order.deliveryLongitude,
                      }}
                      rider={{
                        latitude: order.riderCurrentLatitude,
                        longitude: order.riderCurrentLongitude,
                      }}
                      route={JSON.parse(order.riderRouteJson || "[]")}
                      phase={order.riderRoutePhase}
                      compact
                    />
                    <div className="admin-route-metrics">
                      <span>
                        Remaining
                        <b>
                          {order.remainingDistanceM != null
                            ? `${(order.remainingDistanceM / 1000).toFixed(1)} km`
                            : "—"}
                        </b>
                      </span>
                      <span>
                        ETA
                        <b>
                          {order.remainingDurationS != null
                            ? `${Math.max(1, Math.ceil(order.remainingDurationS / 60))} min`
                            : "—"}
                        </b>
                      </span>
                      <span>
                        Updated
                        <b>
                          {order.riderLocationUpdatedAt
                            ? formatKigaliTime(order.riderLocationUpdatedAt)
                            : "—"}
                        </b>
                      </span>
                    </div>
                  </>
                ) : (
                  <p>Live location appears after the rider starts GPS navigation.</p>
                )}
              </section>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminOrdersClient({
  orders,
  riders,
}: {
  orders: AdminOrder[];
  riders: Rider[];
}) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topScrollContentRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const topScroll = topScrollRef.current;
    const topScrollContent = topScrollContentRef.current;
    const tableScroll = tableScrollRef.current;
    const table = tableScroll?.querySelector("table");

    if (!topScroll || !topScrollContent || !tableScroll || !table) return;

    let syncing = false;
    const updateWidth = () => {
      topScrollContent.style.width = `${table.scrollWidth}px`;
    };
    const syncFromTop = () => {
      if (syncing) return;
      syncing = true;
      tableScroll.scrollLeft = topScroll.scrollLeft;
      syncing = false;
    };
    const syncFromTable = () => {
      if (syncing) return;
      syncing = true;
      topScroll.scrollLeft = tableScroll.scrollLeft;
      syncing = false;
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(table);
    resizeObserver.observe(tableScroll);
    topScroll.addEventListener("scroll", syncFromTop, { passive: true });
    tableScroll.addEventListener("scroll", syncFromTable, { passive: true });

    return () => {
      resizeObserver.disconnect();
      topScroll.removeEventListener("scroll", syncFromTop);
      tableScroll.removeEventListener("scroll", syncFromTable);
    };
  }, [orders.length]);

  return (
    <>
      <div className="admin-orders-note">
        Showing the latest {orders.length} orders.
      </div>
      <div
        className="admin-orders-scrollbar"
        ref={topScrollRef}
        aria-label="Scroll orders left or right"
      >
        <div ref={topScrollContentRef} />
      </div>
      <section className="admin-orders-table" ref={tableScrollRef}>
        <table>
          <thead>
            <tr>
              <th>Order and date</th>
              <th>Customer</th>
              <th>Store</th>
              <th>Rider assignment</th>
              <th>Items</th>
              <th>Delivery address</th>
              <th>Delivery fee</th>
              <th>Grand total</th>
              <th>Order status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {orders.length ? (
              orders.map((order) => (
                <AdminOrderRow initial={order} riders={riders} key={order.id} />
              ))
            ) : (
              <tr>
                <td colSpan={10} className="admin-no-orders">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
