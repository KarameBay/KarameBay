"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, Store, Package, Pencil, Trash2 } from "lucide-react";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";
import { formatRwf } from "@/lib/money";
import type { getPartnerWorkspace } from "@/lib/partner";

type Workspace = Awaited<ReturnType<typeof getPartnerWorkspace>>;
const PickupMap = dynamic(
  () => import("./pickup-map").then((module) => module.PickupMap),
  { ssr: false, loading: () => <p>Loading pickup map…</p> },
);
type PartnerStore = Workspace["stores"][number];
type Product = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  priceRwf: number;
  imageUrl: string;
  imagePublicId: string | null;
  isAvailable: boolean;
  stockQuantity: number;
  unitLabel: string;
};
type Catalog = {
  products: Product[];
  categories: { id: string; name: string }[];
  total: number;
  page: number;
  pages: number;
};
const emptyCatalog: Catalog = {
  products: [],
  categories: [],
  total: 0,
  page: 1,
  pages: 1,
};
const blankProduct = {
  name: "",
  description: "",
  categoryId: "",
  categoryName: "",
  priceRwf: "",
  imageUrl: "",
  imagePublicId: null as string | null,
  isAvailable: true,
  stockQuantity: "0",
  unitLabel: "Each",
  id: "",
};
const blankStore = {
  id: "",
  name: "",
  description: "",
  phone: "",
  address: "",
  latitude: "",
  longitude: "",
  opensAt: "08:00",
  closesAt: "22:00",
  storeTypeId: "",
  isOpen: true,
};

async function save(url: string, input: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error ?? "Could not save. Please try again.");
  return body;
}

export function PartnerWorkspace({ stores, storeTypes }: Workspace) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [storeForm, setStoreForm] = useState({
    ...blankStore,
    storeTypeId: storeTypes[0]?.id ?? "",
  });
  const [showStoreForm, setShowStoreForm] = useState(stores.length === 0);
  const [productForm, setProductForm] = useState(blankProduct);
  const [showProductForm, setShowProductForm] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const catalogKey = JSON.stringify([storeId, page, query, revision]);
  const [loadedKey, setLoadedKey] = useState("");
  const loading = Boolean(storeId) && loadedKey !== catalogKey;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const store = stores.find((s) => s.id === storeId);
  const canEdit = store && ["PENDING", "APPROVED"].includes(store.status);

  useEffect(() => {
    if (!storeId) return;
    const controller = new AbortController();
    fetch(
      `/api/partner/products?storeId=${encodeURIComponent(storeId)}&page=${page}&q=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body as Catalog;
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        setCatalog(body);
        if (page > body.pages) setPage(body.pages);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(e.message ?? "Could not load products.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(catalogKey);
      });
    return () => controller.abort();
  }, [storeId, page, query, revision, catalogKey]);

  function chooseStore(id: string) {
    setStoreId(id);
    setPage(1);
    setQuery("");
    setCatalog(emptyCatalog);
    setShowProductForm(false);
    setShowStoreForm(false);
    setError("");
    setMessage("");
  }
  function editStore(s?: PartnerStore) {
    setStoreForm(
      s
        ? {
            id: s.id,
            name: s.name,
            description: s.description,
            phone: s.phone,
            address: s.address,
            latitude: String(s.latitude),
            longitude: String(s.longitude),
            opensAt: s.opensAt,
            closesAt: s.closesAt,
            storeTypeId: s.storeTypeId,
            isOpen: s.isOpen,
          }
        : { ...blankStore, storeTypeId: storeTypes[0]?.id ?? "" },
    );
    setShowStoreForm(true);
    setError("");
    setMessage("");
  }
  async function submitStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = await save("/api/partner/stores", {
        ...storeForm,
        id: storeForm.id || undefined,
        latitude: Number(storeForm.latitude),
        longitude: Number(storeForm.longitude),
      });
      setStoreId(body.id);
      setPage(1);
      setShowStoreForm(false);
      setMessage(body.message);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save store.");
    } finally {
      setBusy(false);
    }
  }
  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save("/api/partner/products", {
        ...productForm,
        id: productForm.id || undefined,
        storeId,
        categoryId: productForm.categoryId || undefined,
        categoryName: productForm.categoryId
          ? undefined
          : productForm.categoryName,
        priceRwf: Number(productForm.priceRwf),
        stockQuantity: Number(productForm.stockQuantity),
      });
      setShowProductForm(false);
      setProductForm(blankProduct);
      setMessage(
        "Product saved. Admin can also manage it in the shared catalog.",
      );
      setRevision((v) => v + 1);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  }
  async function removeProduct(p: Product) {
    if (!window.confirm(`Remove ${p.name} from your catalog?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save("/api/partner/products", {
        storeId,
        id: p.id,
        action: "delete",
      });
      setRevision((v) => v + 1);
      setMessage("Product removed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="partner-summary">
        <div>
          <Store />
          <b>{stores.length}</b>
          <span>Your stores</span>
        </div>
        <div>
          <Package />
          <b>{stores.reduce((n, s) => n + s.productCount, 0)}</b>
          <span>Your products</span>
        </div>
        <div>
          <b>{stores.filter((s) => s.status === "APPROVED").length}</b>
          <span>Approved stores</span>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="partner-notice" role="status">
          {message}
        </p>
      )}
      <div className="partner-toolbar">
        <div>
          <h2>Your stores</h2>
          <p>Select a store to manage its catalog.</p>
        </div>
        <button
          onClick={() => editStore()}
          disabled={busy || !storeTypes.length}
        >
          <Plus size={18} /> Add store
        </button>
      </div>
      {!storeTypes.length && (
        <p className="partner-notice">
          Store registration is currently unavailable. Please contact Karame
          Bay.
        </p>
      )}
      <div className="partner-store-list">
        {stores.map((s) => (
          <button
            key={s.id}
            className={storeId === s.id ? "selected" : ""}
            onClick={() => chooseStore(s.id)}
            disabled={busy}
          >
            <span>
              <b>{s.name}</b>
              <small>
                {s.storeTypeName} · {s.productCount} products
              </small>
            </span>
            <span className={`partner-status ${s.status.toLowerCase()}`}>
              {s.status === "PENDING"
                ? "Awaiting approval"
                : s.status.toLowerCase()}
            </span>
          </button>
        ))}
      </div>
      {showStoreForm && (
        <section className="partner-panel">
          <h2>{storeForm.id ? "Edit store" : "Set up your store"}</h2>
          <p>
            New stores and changes to store details are reviewed by Admin before
            appearing in the marketplace.
          </p>
          <form className="partner-form" onSubmit={submitStore}>
            <fieldset disabled={busy}>
              <label>
                Store name
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={storeForm.name}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                Store type
                <select
                  required
                  disabled={!!storeForm.id}
                  value={storeForm.storeTypeId}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, storeTypeId: e.target.value })
                  }
                >
                  <option value="">Choose a type</option>
                  {storeTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                About your store
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  value={storeForm.description}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, description: e.target.value })
                  }
                />
              </label>
              <label>
                Business phone
                <input
                  required
                  type="tel"
                  placeholder="0788123456"
                  value={storeForm.phone}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Pickup address
                <input
                  required
                  minLength={3}
                  value={storeForm.address}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, address: e.target.value })
                  }
                />
              </label>
              <div className="wide">
                <b>Choose your pickup location</b>
                <p>
                  Tap the map to place your store pin. Riders will collect
                  orders here.
                </p>
                <PickupMap
                  location={
                    storeForm.latitude &&
                    storeForm.longitude &&
                    Number.isFinite(Number(storeForm.latitude)) &&
                    Number.isFinite(Number(storeForm.longitude)) &&
                    Math.abs(Number(storeForm.latitude)) <= 90 &&
                    Math.abs(Number(storeForm.longitude)) <= 180
                      ? {
                          latitude: Number(storeForm.latitude),
                          longitude: Number(storeForm.longitude),
                        }
                      : null
                  }
                  onChange={(point) =>
                    setStoreForm((f) => ({
                      ...f,
                      latitude: point.latitude.toFixed(6),
                      longitude: point.longitude.toFixed(6),
                    }))
                  }
                />
              </div>
              <label>
                Pickup latitude
                <input
                  required
                  type="number"
                  min={-90}
                  max={90}
                  step="any"
                  placeholder="-1.9441"
                  value={storeForm.latitude}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, latitude: e.target.value })
                  }
                />
              </label>
              <label>
                Pickup longitude
                <input
                  required
                  type="number"
                  min={-180}
                  max={180}
                  step="any"
                  placeholder="30.0619"
                  value={storeForm.longitude}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, longitude: e.target.value })
                  }
                />
              </label>
              <small className="wide">
                Use the coordinates of your pickup location so riders can find
                your store.
              </small>
              <label>
                Opens at (Kigali time)
                <input
                  required
                  type="time"
                  value={storeForm.opensAt}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, opensAt: e.target.value })
                  }
                />
              </label>
              <label>
                Closes at (Kigali time)
                <input
                  required
                  type="time"
                  value={storeForm.closesAt}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, closesAt: e.target.value })
                  }
                />
              </label>
              <label className="partner-checkbox wide">
                <input
                  type="checkbox"
                  checked={storeForm.isOpen}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, isOpen: e.target.checked })
                  }
                />{" "}
                Accept orders during opening hours after approval
              </label>
              <div className="partner-actions wide">
                <button type="submit">
                  {busy ? "Submitting…" : "Submit for approval"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowStoreForm(false)}
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {store && (
        <section className="partner-panel">
          <div className="partner-toolbar">
            <div>
              <h2>{store.name} catalog</h2>
              <p>
                {store.status === "PENDING"
                  ? "Prepare products now. Customers can shop after Admin approves your store."
                  : store.status === "APPROVED"
                    ? "Your available products appear in the marketplace."
                    : "This store is currently unavailable. Contact Karame Bay."}
              </p>
            </div>
            <div className="partner-actions">
              {store.status === "APPROVED" && (
                <Link href={`/stores/${store.slug}`}>View store</Link>
              )}
              <button
                className="secondary"
                disabled={busy || !canEdit}
                onClick={() => editStore(store)}
              >
                Edit store
              </button>
              <button
                disabled={busy || !canEdit || loading}
                onClick={() => {
                  setProductForm({
                    ...blankProduct,
                    categoryId: catalog.categories[0]?.id ?? "",
                  });
                  setShowProductForm(true);
                }}
              >
                <Plus size={18} /> Add product
              </button>
            </div>
          </div>
          {showProductForm && (
            <form
              className="partner-form partner-product-form"
              onSubmit={submitProduct}
            >
              <h3>{productForm.id ? "Edit product" : "New product"}</h3>
              <fieldset disabled={busy}>
                <label>
                  Product name
                  <input
                    required
                    minLength={2}
                    maxLength={200}
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    value={productForm.categoryId}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        categoryId: e.target.value,
                      })
                    }
                  >
                    <option value="">Create a new category</option>
                    {catalog.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!productForm.categoryId && (
                  <label className="wide">
                    New category name
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={productForm.categoryName}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          categoryName: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
                <label>
                  Price (RWF)
                  <input
                    required
                    type="number"
                    min={1}
                    max={100000000}
                    step={1}
                    value={productForm.priceRwf}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        priceRwf: e.target.value,
                      })
                    }
                  />
                </label>
                {store.catalogEngine !== "RESTAURANT" && (
                  <>
                    <label>
                      Unit label
                      <input
                        required
                        maxLength={80}
                        placeholder="Each, 1 kg, 500 ml…"
                        value={productForm.unitLabel}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            unitLabel: e.target.value,
                          })
                        }
                      />
                    </label>
                    {store.tracksInventory && (
                      <label>
                        Stock quantity
                        <input
                          required
                          type="number"
                          min={0}
                          max={1000000}
                          step="any"
                          value={productForm.stockQuantity}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              stockQuantity: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                  </>
                )}
                <label className="wide">
                  Description
                  <textarea
                    maxLength={3000}
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>
                <AdminImageUpload
                  endpoint="/api/partner/uploads/images"
                  label="Product photo"
                  purpose="product"
                  value={productForm.imageUrl}
                  onChange={(url, publicId) =>
                    setProductForm((f) => ({
                      ...f,
                      imageUrl: url,
                      imagePublicId: publicId ?? null,
                    }))
                  }
                />
                <label className="partner-checkbox wide">
                  <input
                    type="checkbox"
                    checked={productForm.isAvailable}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        isAvailable: e.target.checked,
                      })
                    }
                  />{" "}
                  Available for customers
                </label>
                <div className="partner-actions wide">
                  <button type="submit">
                    {busy ? "Saving…" : "Save product"}
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setShowProductForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          <label className="partner-search">
            Search your products
            <input
              type="search"
              placeholder="Search by product name"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div aria-live="polite" aria-busy={loading}>
            {loading ? (
              <p>Loading products…</p>
            ) : !catalog.products.length ? (
              <div className="partner-empty">
                <Package />
                <h3>
                  {query ? "No matching products" : "Your catalog starts here"}
                </h3>
                <p>
                  {query
                    ? "Try a different product name."
                    : "Add your first product with a price, photo and description."}
                </p>
              </div>
            ) : (
              <div className="partner-product-list">
                {catalog.products.map((p) => (
                  <article key={p.id}>
                    <div>
                      <b>{p.name}</b>
                      <small>
                        {p.categoryName} ·{" "}
                        {p.isAvailable ? "Available" : "Unavailable"}
                      </small>
                    </div>
                    <strong>
                      {formatRwf(p.priceRwf)}
                      <small> / {p.unitLabel}</small>
                    </strong>
                    <div className="partner-actions">
                      <button
                        className="secondary"
                        disabled={busy || !canEdit}
                        aria-label={`Edit ${p.name}`}
                        onClick={() => {
                          setProductForm({
                            ...p,
                            priceRwf: String(p.priceRwf),
                            stockQuantity: String(p.stockQuantity),
                          });
                          setShowProductForm(true);
                        }}
                      >
                        <Pencil size={16} /> Edit
                      </button>
                      <button
                        className="danger"
                        disabled={busy || !canEdit}
                        aria-label={`Remove ${p.name}`}
                        onClick={() => removeProduct(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="partner-pagination">
            <span>
              {catalog.total} products · Page {catalog.page} of {catalog.pages}
            </span>
            <div className="partner-actions">
              <button
                className="secondary"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="secondary"
                disabled={loading || page >= catalog.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
