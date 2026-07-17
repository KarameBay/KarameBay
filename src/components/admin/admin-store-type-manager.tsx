"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Layers3, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";

type StoreTypeRow = {
  id: string;
  name: string;
  customerSectionName: string;
  slug: string;
  description: string;
  iconUrl: string | null;
  iconPublicId?: string | null;
  imageUrl: string | null;
  imagePublicId?: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  commerceEngine: string;
  optionalProductFields: string[];
  stockTrackingRequired: boolean;
  ageConfirmationRequired: boolean;
  productUnitsEnabled: boolean;
  brandsEnabled: boolean;
  departmentsEnabled: boolean;
  storeCount: number;
};

type FormState = Omit<StoreTypeRow, "id" | "storeCount"> & { id?: string };

const optionalFields = [
  ["description", "Product description"],
  ["image", "Product image"],
  ["sku", "SKU"],
  ["featured", "Featured product"],
  ["specialInstructions", "Special instructions"],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function blank(): FormState {
  return {
    name: "",
    customerSectionName: "",
    slug: "",
    description: "",
    iconUrl: null,
    iconPublicId: null,
    imageUrl: null,
    imagePublicId: null,
    displayOrder: 0,
    isActive: true,
    isFeatured: false,
    commerceEngine: "RETAIL",
    optionalProductFields: ["description", "image", "sku", "featured"],
    stockTrackingRequired: false,
    ageConfirmationRequired: false,
    productUnitsEnabled: true,
    brandsEnabled: true,
    departmentsEnabled: true,
  };
}

function fromRow(row: StoreTypeRow): FormState {
  return {
    id: row.id,
    name: row.name,
    customerSectionName: row.customerSectionName,
    slug: row.slug,
    description: row.description,
    iconUrl: row.iconUrl,
    iconPublicId: row.iconPublicId ?? null,
    imageUrl: row.imageUrl,
    imagePublicId: row.imagePublicId ?? null,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    commerceEngine: row.commerceEngine,
    optionalProductFields: row.optionalProductFields,
    stockTrackingRequired: row.stockTrackingRequired,
    ageConfirmationRequired: row.ageConfirmationRequired,
    productUnitsEnabled: row.productUnitsEnabled,
    brandsEnabled: row.brandsEnabled,
    departmentsEnabled: row.departmentsEnabled,
  };
}

export function AdminStoreTypeManager({ storeTypes }: { storeTypes: StoreTypeRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blank);
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setForm(blank());
    setMessage("");
    setError("");
  }

  function select(row: StoreTypeRow) {
    setForm(fromRow(row));
    setMessage("");
    setError("");
    document.getElementById("store-type-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function save(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    startSaving(async () => {
      const response = await fetch("/api/admin/store-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Could not save the store type.");
        return;
      }
      setMessage(form.id ? "Store type updated." : "Store type created.");
      setForm(blank());
      router.refresh();
    });
  }

  async function remove(row: StoreTypeRow) {
    if (!window.confirm(`Delete the ${row.name} store type?`)) return;
    const response = await fetch("/api/admin/store-types", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not delete the store type.");
      return;
    }
    if (form.id === row.id) reset();
    setMessage("Store type deleted.");
    router.refresh();
  }

  function toggleOptionalField(field: string) {
    setForm((current) => ({
      ...current,
      optionalProductFields: current.optionalProductFields.includes(field)
        ? current.optionalProductFields.filter((value) => value !== field)
        : [...current.optionalProductFields, field],
    }));
  }

  return (
    <section className="admin-store-types" id="store-types">
      <div className="admin-section-heading">
        <div>
          <span className="catalog-kicker">DYNAMIC STORE TYPES</span>
          <h2>Customer sections and commerce rules</h2>
          <p>Create any business type here. No code change or new deployment is needed.</p>
        </div>
        <button type="button" className="secondary" onClick={reset}><Plus /> New store type</button>
      </div>

      <div className="admin-store-type-layout">
        <div className="admin-store-type-list">
          {storeTypes.map((row) => (
            <article className={form.id === row.id ? "selected" : ""} key={row.id}>
              <button type="button" className="admin-store-type-select" onClick={() => select(row)}>
                <span className="admin-store-type-icon"><Layers3 /></span>
                <span><b>{row.name}</b><small>{row.customerSectionName} · {row.commerceEngine === "RESTAURANT" ? "Restaurant Menu" : "Retail Catalog"}</small></span>
                <span className={`status-pill ${row.isActive ? "open" : "closed"}`}>{row.isActive ? "Active" : "Inactive"}</span>
                <small>{row.storeCount} {row.storeCount === 1 ? "store" : "stores"}</small>
              </button>
              <button type="button" className="admin-store-type-delete" onClick={() => remove(row)} aria-label={`Delete ${row.name}`}><Trash2 /></button>
            </article>
          ))}
        </div>

        <form id="store-type-editor" className="admin-management-card admin-store-type-form" onSubmit={save}>
          <div className="panel-head"><span><Layers3 /></span><div><span className="catalog-kicker">STORE TYPE EDITOR</span><h2>{form.id ? `Edit ${form.name}` : "Create a store type"}</h2><p>The selected engine is reused by every store under this type.</p></div></div>
          <div className="admin-store-type-grid">
            <label>Name<input value={form.name} onChange={(event) => {
              const name = event.target.value;
              setForm((current) => ({
                ...current,
                name,
                customerSectionName:
                  !current.customerSectionName || current.customerSectionName === current.name
                    ? name
                    : current.customerSectionName,
                slug:
                  !current.slug || current.slug === slugify(current.name)
                    ? slugify(name)
                    : current.slug,
              }));
            }} required /></label>
            <label>Customer-facing section name<input value={form.customerSectionName} onChange={(event) => setForm((current) => ({ ...current, customerSectionName: event.target.value }))} placeholder="Flowers" required /></label>
            <label>Slug<input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} placeholder="flowers" required /></label>
            <label>Display order<input type="number" min={0} value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))} required /></label>
            <label className="wide">Description<textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required /></label>
            <label>Commerce engine<select value={form.commerceEngine} onChange={(event) => setForm((current) => ({ ...current, commerceEngine: event.target.value }))}><option value="RESTAURANT">Restaurant Menu Engine</option><option value="RETAIL">Retail Catalog Engine</option></select></label>
            <label>Status<select value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label>Featured section<select value={form.isFeatured ? "yes" : "no"} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.value === "yes" }))}><option value="no">No</option><option value="yes">Yes</option></select></label>
          </div>

          <fieldset className="admin-capability-grid">
            <legend>Catalog capabilities</legend>
            <label><input type="checkbox" checked={form.stockTrackingRequired} onChange={(event) => setForm((current) => ({ ...current, stockTrackingRequired: event.target.checked }))} /> Require stock tracking</label>
            <label><input type="checkbox" checked={form.ageConfirmationRequired} onChange={(event) => setForm((current) => ({ ...current, ageConfirmationRequired: event.target.checked }))} /> Require age confirmation</label>
            <label><input type="checkbox" checked={form.productUnitsEnabled} onChange={(event) => setForm((current) => ({ ...current, productUnitsEnabled: event.target.checked }))} /> Product units</label>
            <label><input type="checkbox" checked={form.brandsEnabled} onChange={(event) => setForm((current) => ({ ...current, brandsEnabled: event.target.checked }))} /> Brands</label>
            <label><input type="checkbox" checked={form.departmentsEnabled} onChange={(event) => setForm((current) => ({ ...current, departmentsEnabled: event.target.checked }))} /> Departments</label>
          </fieldset>

          <fieldset className="admin-capability-grid">
            <legend>Optional product fields</legend>
            {optionalFields.map(([field, label]) => <label key={field}><input type="checkbox" checked={form.optionalProductFields.includes(field)} onChange={() => toggleOptionalField(field)} /> {label}</label>)}
          </fieldset>

          <div className="admin-store-type-images">
            <AdminImageUpload label="Section icon" purpose="store-type" value={form.iconUrl ?? ""} onChange={(iconUrl, iconPublicId) => setForm((current) => ({ ...current, iconUrl: iconUrl || null, iconPublicId: iconPublicId ?? current.iconPublicId }))} />
            <AdminImageUpload label="Section image" purpose="store-type" value={form.imageUrl ?? ""} onChange={(imageUrl, imagePublicId) => setForm((current) => ({ ...current, imageUrl: imageUrl || null, imagePublicId: imagePublicId ?? current.imagePublicId }))} />
          </div>

          <button className="primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Save />}{form.id ? "Save store type" : "Create store type"}</button>
          {message && <p className="form-success">{message}</p>}
          {error && <p className="form-error">{error}</p>}
        </form>
      </div>
    </section>
  );
}
