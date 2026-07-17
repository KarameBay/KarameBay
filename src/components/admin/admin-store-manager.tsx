"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState, useTransition } from "react";
import { LoaderCircle, MapPin, Plus, Save, Store, Trash2 } from "lucide-react";
import { formatRwf } from "@/lib/money";
import { useRouter } from "next/navigation";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";

type AdminStore = {
  id: string;
  slug: string;
  name: string;
  type: string;
  catalogEngine: string;
  storeTypeId: string | null;
  storeType: { id: string; name: string; customerSectionName: string; commerceEngine: string } | null;
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
  logoPublicId?: string | null;
  coverUrl: string | null;
  coverPublicId?: string | null;
  estimatedDeliveryMinutes: number;
  preparationMinutes: number;
  minimumOrderRwf: number;
  rating: number;
  _count: { products: number; orders: number };
};

type AdminStoreTypeOption = {
  id: string;
  name: string;
  customerSectionName: string;
  commerceEngine: string;
  isActive: boolean;
};

type StoreFormState = {
  id?: string;
  name: string;
  storeTypeId: string;
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
  logoPublicId: string;
  coverUrl: string;
  coverPublicId: string;
};

const emptyForm = (storeTypes: AdminStoreTypeOption[]): StoreFormState => ({
  name: "",
  storeTypeId: storeTypes.find((type) => type.isActive)?.id ?? "",
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
  logoPublicId: "",
  coverUrl: "",
  coverPublicId: "",
});

function asForm(store: AdminStore, storeTypes: AdminStoreTypeOption[]): StoreFormState {
  const fallbackStoreType =
    store.storeTypeId ||
    storeTypes.find((type) => type.commerceEngine === store.catalogEngine && type.isActive)?.id ||
    storeTypes.find((type) => type.isActive)?.id ||
    "";

  return {
    id: store.id,
    name: store.name,
    storeTypeId: fallbackStoreType,
    description: store.description || `${store.name} store`,
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
    logoPublicId: store.logoPublicId ?? "",
    coverUrl: store.coverUrl ?? "",
    coverPublicId: store.coverPublicId ?? "",
  };
}

export function AdminStoreManager({
  stores,
  storeTypes,
}: {
  stores: AdminStore[];
  storeTypes: AdminStoreTypeOption[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("new");
  const [form, setForm] = useState<StoreFormState>(() => emptyForm(storeTypes));
  const [hiddenStoreIds, setHiddenStoreIds] = useState<string[]>([]);
  const [deletingStoreId, setDeletingStoreId] = useState("");
  const [saving, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const visibleStores = stores.filter((store) => store.status !== "ARCHIVED" && !hiddenStoreIds.includes(store.id));

  function pickStore(store: AdminStore) {
    setSelectedId(store.id);
    setForm(asForm(store, storeTypes));
    setMessage("");
    setError("");
  }

  function resetForm() {
    setSelectedId("new");
    setForm(emptyForm(storeTypes));
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
        setError(data.error ?? data.details ?? "Could not save the store.");
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
      `Remove ${storeName} from Karame Bay?\n\nIf it has orders, it will be archived and hidden from customers so order history stays safe.`,
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingStoreId(storeId);
    try {
      const response = await fetch("/api/admin/stores", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: storeId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const deleteError = data.error ?? "Could not delete the store.";
        setError(deleteError);
        window.alert(deleteError);
        return;
      }

      setHiddenStoreIds((current) => [...new Set([...current, storeId])]);
      if (selectedId === storeId) {
        resetForm();
      }
      setMessage(data.archived ? "Store archived and hidden from the active store list." : "Store deleted.");
      router.refresh();
    } catch {
      const deleteError = "Could not connect to Karame Bay. Please try again.";
      setError(deleteError);
      window.alert(deleteError);
    } finally {
      setDeletingStoreId("");
    }
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
            <span className="catalog-kicker">STORE MANAGEMENT</span>
            <h2>{selectedId === "new" ? "Add a new store" : "Edit store"}</h2>
            <p>
              Register Karame Bay restaurants, markets, or any future store here.
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
              value={form.storeTypeId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  storeTypeId: event.target.value,
                }))
              }
              required
            >
              <option value="">Choose a store type</option>
              {storeTypes.map((type) => (
                <option
                  value={type.id}
                  key={type.id}
                  disabled={!type.isActive && form.storeTypeId !== type.id}
                >
                  {type.name}{type.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Commerce engine
            <input
              value={
                storeTypes.find((type) => type.id === form.storeTypeId)?.commerceEngine === "RESTAURANT"
                  ? "Restaurant Menu Engine"
                  : form.storeTypeId
                    ? "Retail Catalog Engine"
                    : "Choose a store type first"
              }
              readOnly
            />
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
            onChange={(logoUrl, logoPublicId) =>
              setForm((current) => ({ ...current, logoUrl, logoPublicId: logoPublicId ?? current.logoPublicId }))
            }
            help="Choose the store logo from your computer or phone."
          />
          <AdminImageUpload
            label="Store cover image"
            purpose="store-cover"
            value={form.coverUrl}
            onChange={(coverUrl, coverPublicId) =>
              setForm((current) => ({ ...current, coverUrl, coverPublicId: coverPublicId ?? current.coverPublicId }))
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
          {visibleStores.map((store) => (
            <div
              key={store.id}
              role="group"
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
                    {store.storeType?.name ?? store.type} · {store.catalogEngine === "RESTAURANT" ? "Restaurant Menu Engine" : "Retail Catalog Engine"}
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
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    pickStore(store);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="secondary"
                  style={{ width: "auto", padding: "0 14px", background: "#8f3d2d" }}
                  disabled={deletingStoreId === store.id}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void removeStore(store.id, store.name);
                  }}
                >
                  <Trash2 /> {deletingStoreId === store.id ? "Removing..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {!visibleStores.length && (
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
