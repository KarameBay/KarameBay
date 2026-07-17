"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  MapPin,
  Package,
  PackagePlus,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatRwf } from "@/lib/money";
import { formatKigaliDateTime } from "@/lib/date-format";
import {
  customerCanCancelParcel,
  parcelStatusLabel,
  terminalParcelStatus,
} from "./parcel-status";

export type CustomerParcelListItem = {
  referenceNumber: string;
  status: string;
  pickupAddress: string;
  pickupAddressDetails: string;
  deliveryAddress: string;
  deliveryAddressDetails: string;
  recipientName: string;
  categoryName: string;
  sizeName: string;
  totalRwf: number;
  createdAt: string;
  paymentStatus: string;
  riderName: string | null;
};

export function CustomerParcelList({
  initialParcels,
}: {
  initialParcels: CustomerParcelListItem[];
}) {
  const [parcels, setParcels] = useState(initialParcels);
  const [filter, setFilter] = useState<"active" | "history">("active");
  const [workingReference, setWorkingReference] = useState("");
  const [message, setMessage] = useState("");

  const visible = useMemo(
    () =>
      parcels.filter((parcel) =>
        filter === "active"
          ? !terminalParcelStatus(parcel.status)
          : terminalParcelStatus(parcel.status),
      ),
    [filter, parcels],
  );

  async function cancel(reference: string) {
    if (!window.confirm("Cancel this parcel request?")) return;
    setWorkingReference(reference);
    setMessage("");
    try {
      const response = await fetch(`/api/parcels/${reference}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error ?? "This parcel could not be cancelled.");
      setParcels((current) =>
        current.map((parcel) =>
          parcel.referenceNumber === reference
            ? { ...parcel, status: data.parcel?.status ?? "CANCELLED" }
            : parcel,
        ),
      );
      setMessage("Parcel request cancelled.");
    } catch (cancelError) {
      setMessage(
        cancelError instanceof Error
          ? cancelError.message
          : "This parcel could not be cancelled.",
      );
    } finally {
      setWorkingReference("");
    }
  }

  return (
    <div className="customer-parcel-list">
      <header>
        <div>
          <span className="catalog-kicker">MY PARCEL DELIVERIES</span>
          <h2>Send and track packages</h2>
          <p>
            Parcel requests stay separate from restaurant and market orders.
          </p>
        </div>
        <Link href="/customer/parcels/new">
          <PackagePlus /> Send a parcel
        </Link>
      </header>

      <div className="parcel-list-tabs" role="tablist">
        <button
          type="button"
          className={filter === "active" ? "active" : ""}
          onClick={() => setFilter("active")}
        >
          Active
          <span>{parcels.filter((item) => !terminalParcelStatus(item.status)).length}</span>
        </button>
        <button
          type="button"
          className={filter === "history" ? "active" : ""}
          onClick={() => setFilter("history")}
        >
          Completed & cancelled
          <span>{parcels.filter((item) => terminalParcelStatus(item.status)).length}</span>
        </button>
      </div>

      {message && <p className="parcel-list-message">{message}</p>}

      <section>
        {visible.length ? (
          visible.map((parcel) => (
            <article className="customer-parcel-card" key={parcel.referenceNumber}>
              <div className="customer-parcel-card-head">
                <span className="parcel-card-icon"><Package /></span>
                <div>
                  <small>{parcel.referenceNumber}</small>
                  <h3>{parcel.categoryName}</h3>
                  <p>{formatKigaliDateTime(parcel.createdAt)}</p>
                </div>
                <span className={`parcel-status-badge ${parcel.status.toLowerCase()}`}>
                  {parcelStatusLabel(parcel.status)}
                </span>
              </div>
              <div className="customer-parcel-route">
                <div>
                  <span className="pickup" />
                  <div><small>PICKUP</small><b>{parcel.pickupAddressDetails || parcel.pickupAddress}</b></div>
                </div>
                <div>
                  <span className="delivery" />
                  <div><small>DELIVERY</small><b>{parcel.deliveryAddressDetails || parcel.deliveryAddress}</b></div>
                </div>
              </div>
              <div className="customer-parcel-meta">
                <span><UserRound /><small>Recipient</small><b>{parcel.recipientName}</b></span>
                <span><Package /><small>Size</small><b>{parcel.sizeName}</b></span>
                <span><Clock3 /><small>Payment</small><b>{parcel.paymentStatus.toLowerCase().replaceAll("_", " ")}</b></span>
                <span><MapPin /><small>Rider</small><b>{parcel.riderName ?? "Not assigned"}</b></span>
              </div>
              <footer>
                <strong>{formatRwf(parcel.totalRwf)}</strong>
                <div>
                  {customerCanCancelParcel(parcel.status) && (
                    <button
                      type="button"
                      onClick={() => cancel(parcel.referenceNumber)}
                      disabled={workingReference === parcel.referenceNumber}
                    >
                      {workingReference === parcel.referenceNumber
                        ? "Cancelling…"
                        : "Cancel request"}
                    </button>
                  )}
                  <Link href={`/customer/parcels/${parcel.referenceNumber}`}>
                    View & track <ArrowRight />
                  </Link>
                </div>
              </footer>
            </article>
          ))
        ) : (
          <div className="parcel-list-empty">
            <Package />
            <h3>{filter === "active" ? "No active parcel deliveries" : "No parcel history yet"}</h3>
            <p>Your parcel requests and delivery progress will appear here.</p>
            <Link href="/customer/parcels/new">Send your first parcel</Link>
          </div>
        )}
      </section>
    </div>
  );
}
