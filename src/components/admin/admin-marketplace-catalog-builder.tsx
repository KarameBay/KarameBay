"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";
import { formatRwf } from "@/lib/catalog";
import { DEFAULT_MARKET_IMAGE, productImage } from "@/lib/product-images";

type Category = { id: string; name: string; description: string | null };
type Department = {
  id: string;
  name: string;
  description: string | null;
  categories: Category[];
};
type Market = {
  id: string;
  name: string;
  slug: string;
  departments: Department[];
  productCount: number;
};
type Product = {
  id: string;
  storeId: string;
  departmentId: string;
  categoryId: string;
  name: string;
  description: string | null;
  brand: string | null;
  sku: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  featured: boolean;
  department: { id: string; name: string };
  category: { id: string; name: string };
  units: Array<{
    id: string;
    label: string;
    unitType: string;
    priceRwf: number;
    isDefault: boolean;
  }>;
  inventory: { stockQuantity: number } | null;
};

const blankProduct = (market?: Market) => ({
  id: "",
  storeId: market?.id ?? "",
  departmentId: market?.departments[0]?.id ?? "",
  categoryId: market?.departments[0]?.categories[0]?.id ?? "",
  name: "",
  description: "",
  brand: "",
  sku: "",
  imageUrl: DEFAULT_MARKET_IMAGE,
  unitLabel: "Each",
  unitType: "EACH",
  priceRwf: "",
  stockQuantity: "1",
  isAvailable: true,
  featured: false,
});

async function catalogRequest(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/marketplace-catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Could not update the market catalog.");
  return data;
}

export function AdminMarketplaceCatalogBuilder({ markets }: { markets: Market[] }) {
  const router = useRouter();
  const [marketId, setMarketId] = useState(markets[0]?.id ?? "");
  const market = useMemo(() => markets.find((item) => item.id === marketId) ?? markets[0], [marketId, markets]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [product, setProduct] = useState(blankProduct(market));
  const [departmentName, setDepartmentName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDepartmentId, setCategoryDepartmentId] = useState(market?.departments[0]?.id ?? "");

  const loadProducts = useCallback(async () => {
    if (!market?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ storeId: market.id, page: String(page) });
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/admin/marketplace-catalog?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load products.");
      setProducts(data.products);
      setPages(data.pages);
      setTotal(data.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [market?.id, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts, search]);

  useEffect(() => {
    if (!market) return;
    setProduct(blankProduct(market));
    setCategoryDepartmentId(market.departments[0]?.id ?? "");
    setPage(1);
  }, [market]);

  const categories = useMemo(
    () => market?.departments.find((item) => item.id === product.departmentId)?.categories ?? [],
    [market, product.departmentId],
  );

  function chooseProduct(item: Product) {
    const unit = item.units.find((value) => value.isDefault) ?? item.units[0];
    setProduct({
      id: item.id,
      storeId: item.storeId,
      departmentId: item.departmentId,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? "",
      brand: item.brand ?? "",
      sku: item.sku ?? "",
      imageUrl: item.imageUrl ?? DEFAULT_MARKET_IMAGE,
      unitLabel: unit?.label ?? "Each",
      unitType: unit?.unitType ?? "EACH",
      priceRwf: String(unit?.priceRwf ?? 0),
      stockQuantity: String(item.inventory?.stockQuantity ?? 0),
      isAvailable: item.isAvailable,
      featured: item.featured,
    });
    setMessage("");
    setError("");
    document.getElementById("market-product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await catalogRequest({
        entity: "product",
        action: "save",
        ...product,
        priceRwf: Number(product.priceRwf),
        stockQuantity: Number(product.stockQuantity),
      });
      setMessage(product.id ? "Product updated." : "Product added to the market.");
      setProduct(blankProduct(market));
      await loadProducts();
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(item: Product) {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await catalogRequest({ entity: "product", action: "delete", id: item.id });
      if (product.id === item.id) setProduct(blankProduct(market));
      setMessage("Product deleted.");
      await loadProducts();
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the product.");
    }
  }

  async function addDepartment(event: FormEvent) {
    event.preventDefault();
    try {
      await catalogRequest({ entity: "department", action: "save", storeId: market.id, name: departmentName });
      setDepartmentName("");
      setMessage("Department added.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add the department.");
    }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    try {
      await catalogRequest({
        entity: "category",
        action: "save",
        departmentId: categoryDepartmentId,
        name: categoryName,
      });
      setCategoryName("");
      setMessage("Category added.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add the category.");
    }
  }

  if (!markets.length) {
    return <section className="admin-management-card"><h2>No market stores yet</h2><p>Create a store with the Marketplace catalog engine first.</p></section>;
  }

  return (
    <div className="market-engine-shell">
      <section className="admin-management-card market-engine-toolbar">
        <label>
          Market
          <select value={market.id} onChange={(event) => setMarketId(event.target.value)}>
            {markets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div><small>Departments</small><b>{market.departments.length}</b></div>
        <div><small>Categories</small><b>{market.departments.reduce((sum, item) => sum + item.categories.length, 0)}</b></div>
        <div><small>Products</small><b>{market.productCount}</b></div>
      </section>

      <section className="market-engine-taxonomy">
        <form className="admin-management-card market-quick-form" onSubmit={addDepartment}>
          <div><span className="catalog-kicker">CATALOG STRUCTURE</span><h2>Add department</h2></div>
          <div className="market-inline-fields">
            <input value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="Groceries" required minLength={2} />
            <button type="submit"><Plus /> Add</button>
          </div>
          <p>{market.departments.map((item) => item.name).join(" · ") || "No departments yet"}</p>
        </form>
        <form className="admin-management-card market-quick-form" onSubmit={addCategory}>
          <div><span className="catalog-kicker">CATALOG STRUCTURE</span><h2>Add category</h2></div>
          <select value={categoryDepartmentId} onChange={(event) => setCategoryDepartmentId(event.target.value)} required>
            <option value="">Choose department</option>
            {market.departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <div className="market-inline-fields">
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Beverages" required minLength={2} />
            <button type="submit"><Plus /> Add</button>
          </div>
        </form>
      </section>

      {(message || error) && <div className={error ? "form-error market-engine-message" : "form-success market-engine-message"}>{error || message}</div>}

      <section className="market-engine-main">
        <form id="market-product-editor" className="admin-management-card market-product-editor" onSubmit={saveProduct}>
          <div className="panel-head">
            <span><PackagePlus /></span>
            <div><span className="catalog-kicker">MARKET PRODUCT</span><h2>{product.id ? "Edit product" : "Add product"}</h2><p>Price and stock belong to this market only.</p></div>
          </div>
          <div className="market-form-grid">
            <label>Product name<input value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} required /></label>
            <label>Brand<input value={product.brand} onChange={(event) => setProduct({ ...product, brand: event.target.value })} placeholder="Optional" /></label>
            <label>Department<select value={product.departmentId} onChange={(event) => {
              const departmentId = event.target.value;
              const firstCategory = market.departments.find((item) => item.id === departmentId)?.categories[0]?.id ?? "";
              setProduct({ ...product, departmentId, categoryId: firstCategory });
            }} required><option value="">Choose department</option>{market.departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Category<select value={product.categoryId} onChange={(event) => setProduct({ ...product, categoryId: event.target.value })} required><option value="">Choose category</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Price (RWF)<input type="number" min="0" value={product.priceRwf} onChange={(event) => setProduct({ ...product, priceRwf: event.target.value })} required /></label>
            <label>Stock quantity<input type="number" min="0" step="0.01" value={product.stockQuantity} onChange={(event) => setProduct({ ...product, stockQuantity: event.target.value })} required /></label>
            <label>Unit label<input value={product.unitLabel} onChange={(event) => setProduct({ ...product, unitLabel: event.target.value })} placeholder="500 ml, 1 kg, Each" required /></label>
            <label>SKU<input value={product.sku} onChange={(event) => setProduct({ ...product, sku: event.target.value })} placeholder="Optional" /></label>
            <label className="market-span-2">Description<textarea rows={3} value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} /></label>
            <label>Availability<select value={product.isAvailable ? "yes" : "no"} onChange={(event) => setProduct({ ...product, isAvailable: event.target.value === "yes" })}><option value="yes">Available</option><option value="no">Unavailable</option></select></label>
            <label>Featured<select value={product.featured ? "yes" : "no"} onChange={(event) => setProduct({ ...product, featured: event.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select></label>
            <AdminImageUpload label="Product image" purpose="product" value={product.imageUrl} onChange={(imageUrl) => setProduct({ ...product, imageUrl })} />
          </div>
          <div className="market-editor-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving…" : product.id ? "Save changes" : "Add product"}</button>
            {product.id && <button type="button" className="secondary" onClick={() => setProduct(blankProduct(market))}>New product</button>}
          </div>
        </form>

        <section className="admin-management-card market-product-list">
          <div className="market-list-head">
            <div><span className="catalog-kicker">PRODUCTS</span><h2>{market.name}</h2><p>{total} matching products</p></div>
            <label className="market-search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search products, SKU, brand…" /></label>
          </div>
          <div className="market-product-rows" aria-busy={loading}>
            {loading && <p>Loading products…</p>}
            {!loading && products.map((item) => {
              const unit = item.units.find((value) => value.isDefault) ?? item.units[0];
              return <article key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}<img src={productImage(item.imageUrl, { catalogEngine: "MARKETPLACE", productName: item.name })} alt="" />
                <div><b>{item.name}</b><small>{item.category.name} · {unit?.label ?? "Each"}</small><span>{formatRwf(unit?.priceRwf ?? 0)} · Stock {item.inventory?.stockQuantity ?? 0}</span></div>
                <button type="button" className="secondary" onClick={() => chooseProduct(item)} aria-label={`Edit ${item.name}`}><Pencil /></button>
                <button type="button" className="secondary danger" onClick={() => deleteProduct(item)} aria-label={`Delete ${item.name}`}><Trash2 /></button>
              </article>;
            })}
            {!loading && !products.length && <p>No products found. Add the first product using the editor.</p>}
          </div>
          <div className="market-pagination">
            <button type="button" className="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /> Previous</button>
            <span>Page {page} of {pages}</span>
            <button type="button" className="secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight /></button>
          </div>
        </section>
      </section>
    </div>
  );
}
