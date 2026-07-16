"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState, useTransition } from "react";
import { LoaderCircle, MapPin, Plus, Save, Store, Trash2 } from "lucide-react";
import { formatRwf } from "@/lib/catalog";
import { useRouter } from "next/navigation";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";

type AdminStore = {
  id: string;
  slug: string;
  name: string;
  type: string;
  catalogEngine: string;
  description: string;
  phone: string | null;
  address: string;
  latitude: number;
  longitude: number;
  opensAt: string;
  closesAt: string;
  status: string;
  isOpen: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  estimatedDeliveryMinutes: number;
  preparationMinutes: number;
  minimumOrderRwf: number;
  rating: number;
  _count: { products: number; orders: number };
};

type StoreFormState = {
  id?: string;
  name: string;
  type: "RESTAURANT" | "MARKET";
  catalogEngine: "RESTAURANT" | "MARKETPLACE";
  description: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  opensAt: string;
  closesAt: string;
  status: string;
  isOpen: boolean;
  estimatedDeliveryMinutes: string;
  preparationMinutes: string;
  minimumOrderRwf: string;
  rating: string;
  logoUrl: string;
  coverUrl: string;
};

const emptyForm = (): StoreFormState => ({
  name: "",
  type: "RESTAURANT",
  catalogEngine: "RESTAURANT",
  description: "",
  phone: "",
  address: "",
  latitude: "",
  longitude: "",
  opensAt: "07:00",
  closesAt: "22:00",
  status: "APPROVED",
  isOpen: true,
  estimatedDeliveryMinutes: "35",
  preparationMinutes: "20",
  minimumOrderRwf: "0",
  rating: "0",
  logoUrl: "",
  coverUrl: "",
});

function asForm(store: AdminStore): StoreFormState {
  return {
    id: store.id,
    name: store.name,
    type: store.type as "RESTAURANT" | "MARKET",
    catalogEngine: store.catalogEngine as "RESTAURANT" | "MARKETPLACE",
    description: store.description,
    phone: store.phone ?? "",
    address: store.address,
    latitude: String(store.latitude),
    longitude: String(store.longitude),
    opensAt: store.opensAt,
    closesAt: store.closesAt,
    status: store.status,
    isOpen: store.isOpen,
    estimatedDeliveryMinutes: String(store.estimatedDeliveryMinutes),
    preparationMinutes: String(store.preparationMinutes),
    minimumOrderRwf: String(store.minimumOrderRwf),
    rating: String(store.rating),
    logoUrl: store.logoUrl ?? "",
    coverUrl: store.coverUrl ?? "",
  };
}

export function AdminStoreManager({
  stores,
}: {
  stores: AdminStore[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("new");
  const [form, setForm] = useState<StoreFormState>(emptyForm());
  const [saving, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function pickStore(store: AdminStore) {
    setSelectedId(store.id);
    setForm(asForm(store));
    setMessage("");
    setError("");
  }

  function resetForm() {
    setSelectedId("new");
    setForm(emptyForm());
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          estimatedDeliveryMinutes: Number(form.estimatedDeliveryMinutes),
          preparationMinutes: Number(form.preparationMinutes),
          minimumOrderRwf: Number(form.minimumOrderRwf),
          rating: Number(form.rating),
          id: selectedId === "new" ? undefined : selectedId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save the store.");
        return;
      }
      setMessage(
        selectedId === "new"
          ? "Store added successfully."
          : "Store updated successfully.",
      );
      resetForm();
      router.refresh();
    });
  }

  async function removeStore(storeId: string, storeName: string) {
    const confirmed = window.confirm(
      `Delete ${storeName}? This removes the store from Karame Bay Admin.`,
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    const response = await fetch("/api/admin/stores", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: storeId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not delete the store.");
      return;
    }

    if (selectedId === storeId) {
      resetForm();
    }
    setMessage("Store deleted.");
    router.refresh();
  }

  return (
    <section
      className="admin-management-shell"
      style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: "16px",
        alignItems: "start",
        marginTop: "24px",
      }}
    >
      <form className="admin-management-card" onSubmit={save}>
        <div className="panel-head">
          <span>
            <Plus />
          </span>
          <div>
            <span className="catalog-kicker">STORE / MARKET MANAGEMENT</span>
            <h2>{selectedId === "new" ? "Add a new store" : "Edit store"}</h2>
            <p>
              Register Java House, Kimironko Market, or any future store here.
              Set the GPS pin, address, hours, and delivery timing in one place.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
            marginTop: "18px",
          }}
        >
          <label style={fieldStyle}>
            Store name
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Java House Kigali Heights"
              required
            />
          </label>
          <label style={fieldStyle}>
            Store type
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as "RESTAURANT" | "MARKET",
                  catalogEngine:
                    event.target.value === "RESTAURANT"
                      ? "RESTAURANT"
                      : "MARKETPLACE",
                }))
              }
            >
              <option value="RESTAURANT">Restaurant</option>
              <option value="MARKET">Market</option>
            </select>
          </label>
          <label style={fieldStyle}>
            Catalog engine
            <select
              value={form.catalogEngine}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  catalogEngine: event.target.value as
                    | "RESTAURANT"
                    | "MARKETPLACE",
                }))
              }
            >
              <option value="RESTAURANT">Restaurant menu engine</option>
              <option value="MARKETPLACE">Marketplace catalog</option>
            </select>
          </label>
          <label style={fieldStyle}>
            Open status
            <select
              value={form.isOpen ? "open" : "closed"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isOpen: event.target.value === "open",
                }))
              }
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Short store description"
              rows={3}
              required
            />
          </label>
          <label style={fieldStyle}>
            Phone
            <input
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="+2507..."
            />
          </label>
          <label style={fieldStyle}>
            Address
            <input
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              placeholder="Kigali Heights, KG 7 Ave"
              required
            />
          </label>
          <label style={fieldStyle}>
            Latitude
            <input
              value={form.latitude}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  latitude: event.target.value,
                }))
              }
              placeholder="-1.9536"
              required
            />
          </label>
          <label style={fieldStyle}>
            Longitude
            <input
              value={form.longitude}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  longitude: event.target.value,
                }))
              }
              placeholder="30.0935"
              required
            />
          </label>
          <label style={fieldStyle}>
            Opens at
            <input
              value={form.opensAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  opensAt: event.target.value,
                }))
              }
              placeholder="07:00"
              required
            />
          </label>
          <label style={fieldStyle}>
            Closes at
            <input
              value={form.closesAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  closesAt: event.target.value,
                }))
              }
              placeholder="22:00"
              required
            />
          </label>
          <label style={fieldStyle}>
            Minimum order
            <input
              value={form.minimumOrderRwf}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  minimumOrderRwf: event.target.value,
                }))
              }
              type="number"
              min={0}
            />
          </label>
          <label style={fieldStyle}>
            Preparation minutes
            <input
              value={form.preparationMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  preparationMinutes: event.target.value,
                }))
              }
              type="number"
              min={0}
            />
          </label>
          <label style={fieldStyle}>
            Estimated delivery minutes
            <input
              value={form.estimatedDeliveryMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  estimatedDeliveryMinutes: event.target.value,
                }))
              }
              type="number"
              min={5}
            />
          </label>
          <label style={fieldStyle}>
            Rating
            <input
              value={form.rating}
              onChange={(event) =>
                setForm((current) => ({ ...current, rating: event.target.value }))
              }
              type="number"
              min={0}
              max={5}
              step="0.1"
            />
          </label>
          <AdminImageUpload
            label="Store logo"
            purpose="store-logo"
            value={form.logoUrl}
            onChange={(logoUrl) =>
              setForm((current) => ({ ...current, logoUrl }))
            }
            help="Choose the store logo from your computer or phone."
          />
          <AdminImageUpload
            label="Store cover image"
            purpose="store-cover"
            value={form.coverUrl}
            onChange={(coverUrl) =>
              setForm((current) => ({ ...current, coverUrl }))
            }
            help="Choose a wide image for the store page cover."
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="spin" /> : <Save />}
            {selectedId === "new" ? "Create store" : "Save changes"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={resetForm}
            style={{ width: "160px" }}
          >
            <Plus /> New store
          </button>
        </div>

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}

        <div className="warning" style={{ justifyContent: "flex-start" }}>
          <MapPin />
          <span>
            Store location is used for route distance and delivery fee
            calculations.
          </span>
        </div>
      </form>

      <aside className="admin-management-card">
        <div className="panel-head">
          <span>
            <Store />
          </span>
          <div>
            <span className="catalog-kicker">CURRENT STORES</span>
            <h2>Managed inside Admin</h2>
            <p>Click any store to edit it. Everything stays inside Admin.</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {stores.map((store) => (
            <div
              key={store.id}
              onClick={() => pickStore(store)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pickStore(store);
                }
              }}
              className="admin-store-row"
              style={{
                textAlign: "left",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "14px",
                background: selectedId === store.id ? "#eef4eb" : "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <div>
                  <b style={{ display: "block", fontSize: "14px" }}>{store.name}</b>
                  <small style={{ color: "var(--muted)" }}>
                    {store.type} · {store.catalogEngine}
                  </small>
                </div>
                <span className={`status-pill ${store.isOpen ? "open" : "closed"}`}>
                  {store.isOpen ? "Open" : "Closed"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginTop: "10px",
                  color: "var(--muted)",
                  fontSize: "11px",
                }}
              >
                <span>{store.address}</span>
                <span>{store._count.products} products</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginTop: "8px",
                  color: "var(--muted)",
                  fontSize: "11px",
                }}
              >
                <span>{store.opensAt} – {store.closesAt}</span>
                <span>{formatRwf(store.minimumOrderRwf)} minimum</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "12px",
                  justifyContent: "flex-end",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="secondary"
                  style={{ width: "auto", padding: "0 14px" }}
                  onClick={() => pickStore(store)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="secondary"
                  style={{ width: "auto", padding: "0 14px", background: "#8f3d2d" }}
                  onClick={() => removeStore(store.id, store.name)}
                >
                  <Trash2 /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {!stores.length && (
          <div className="empty" style={{ padding: "18px 0" }}>
            No stores yet. Create the first store above.
          </div>
        )}
      </aside>
    </section>
  );
}

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "11px",
  fontWeight: 700,
};
