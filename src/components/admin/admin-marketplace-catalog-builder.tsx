"use client";

/* Changing the selected market intentionally resets its dependent editor state. */
/* eslint-disable react-hooks/set-state-in-effect */
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";
import { formatRwf } from "@/lib/catalog";
import { DEFAULT_MARKET_IMAGE, productImage } from "@/lib/product-images";
import type { OptionalProductField, StoreTypeCapabilities } from "@/lib/store-types";

type Category = { id: string; name: string; description: string | null };
type Department = {
  id: string;
  name: string;
  description: string | null;
  categories: Category[];
};
type CategoryWithDepartment = Category & { department: Department };
type Market = {
  id: string;
  name: string;
  slug: string;
  departments: Department[];
  productCount: number;
  storeTypeName: string;
  capabilities: StoreTypeCapabilities;
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
  imagePublicId?: string | null;
  containerChargePerUnitRwf: number;
  containerChargeFlatRwf: number;
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
  imagePublicId: "",
  containerChargePerUnitRwf: "0",
  containerChargeFlatRwf: "0",
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
  if (!response.ok) throw new Error(data.error ?? "Could not update the retail catalog.");
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
  const [departmentForm, setDepartmentForm] = useState({ id: "", name: "", description: "" });
  const [categoryForm, setCategoryForm] = useState({ id: "", name: "", description: "" });
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
  }, [market, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts, search]);

  useEffect(() => {
    if (!market) return;
    setProduct(blankProduct(market));
    setCategoryDepartmentId(market.departments[0]?.id ?? "");
    setDepartmentForm({ id: "", name: "", description: "" });
    setCategoryForm({ id: "", name: "", description: "" });
    setPage(1);
  }, [market]);

  const categories = useMemo(
    () =>
      market?.capabilities.departmentsEnabled
        ? market.departments.find((item) => item.id === product.departmentId)?.categories ?? []
        : market?.departments.flatMap((item) => item.categories) ?? [],
    [market, product.departmentId],
  );
  const hasOptionalField = (field: OptionalProductField) =>
    market.capabilities.optionalProductFields.includes(field);

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
      imagePublicId: item.imagePublicId ?? "",
      containerChargePerUnitRwf: String(item.containerChargePerUnitRwf ?? 0),
      containerChargeFlatRwf: String(item.containerChargeFlatRwf ?? 0),
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
        containerChargePerUnitRwf: Number(product.containerChargePerUnitRwf),
        containerChargeFlatRwf: Number(product.containerChargeFlatRwf),
        stockQuantity: Number(product.stockQuantity),
      });
      setMessage(product.id ? "Product updated." : "Product added to the store.");
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
      setProducts((current) => current.filter((productRow) => productRow.id !== item.id));
      setTotal((current) => Math.max(0, current - 1));
      if (product.id === item.id) setProduct(blankProduct(market));
      setMessage("Product deleted.");
      await loadProducts();
      router.refresh();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Could not delete the product.";
      setError(message);
      window.alert(message);
    }
  }

  async function saveDepartment(event: FormEvent) {
    event.preventDefault();
    try {
      await catalogRequest({
        entity: "department",
        action: "save",
        id: departmentForm.id || undefined,
        storeId: market.id,
        name: departmentForm.name,
        description: departmentForm.description,
      });
      setDepartmentForm({ id: "", name: "", description: "" });
      setMessage(departmentForm.id ? "Department updated." : "Department added.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the department.");
    }
  }

  async function deleteDepartment(department: Department) {
    if (!window.confirm(`Delete ${department.name}?`)) return;
    try {
      await catalogRequest({ entity: "department", action: "delete", id: department.id });
      setDepartmentForm({ id: "", name: "", description: "" });
      setMessage("Department deleted.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the department.");
    }
  }

  function editDepartment(department: Department) {
    setDepartmentForm({ id: department.id, name: department.name, description: department.description ?? "" });
    setMessage("");
    setError("");
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    try {
      await catalogRequest({
        entity: "category",
        action: "save",
        id: categoryForm.id || undefined,
        storeId: market.id,
        departmentId: categoryDepartmentId || market.departments[0]?.id || undefined,
        name: categoryForm.name,
        description: categoryForm.description,
      });
      setCategoryForm({ id: "", name: "", description: "" });
      setMessage(categoryForm.id ? "Category updated." : "Category added.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the category.");
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    try {
      await catalogRequest({ entity: "category", action: "delete", id: category.id });
      setCategoryForm({ id: "", name: "", description: "" });
      setMessage("Category deleted.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the category.");
    }
  }

  function editCategory(category: CategoryWithDepartment) {
    setCategoryDepartmentId(category.department.id);
    setCategoryForm({ id: category.id, name: category.name, description: category.description ?? "" });
    setMessage("");
    setError("");
  }

  const allCategories = market.departments.flatMap((department) =>
    department.categories.map((category) => ({ ...category, department })),
  );

  if (!markets.length) {
    return <section className="admin-management-card"><h2>No retail stores yet</h2><p>Create a store type using the Retail Catalog Engine, then create a store under it.</p></section>;
  }

  return (
    <div className="market-engine-shell">
      <section className="admin-management-card market-engine-toolbar">
        <label>
          Retail store
          <select value={market.id} onChange={(event) => setMarketId(event.target.value)}>
            {markets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div><small>Store type</small><b>{market.storeTypeName}</b></div>
        <div><small>Categories</small><b>{market.departments.reduce((sum, item) => sum + item.categories.length, 0)}</b></div>
        <div><small>Products</small><b>{market.productCount}</b></div>
      </section>

      <section className="market-engine-taxonomy">
        {market.capabilities.departmentsEnabled ? (
          <form className="admin-management-card market-quick-form" onSubmit={saveDepartment}>
            <div><span className="catalog-kicker">CATALOG STRUCTURE</span><h2>{departmentForm.id ? "Edit department" : "Add department"}</h2></div>
            <div className="market-inline-fields">
              <input value={departmentForm.name} onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))} placeholder="Groceries" required minLength={2} />
              <button type="submit"><Plus /> {departmentForm.id ? "Save" : "Add"}</button>
            </div>
            <input value={departmentForm.description} onChange={(event) => setDepartmentForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description, optional" />
            {departmentForm.id ? <button type="button" className="secondary market-cancel-edit" onClick={() => setDepartmentForm({ id: "", name: "", description: "" })}>Cancel editing</button> : null}
            <div className="market-taxonomy-title"><b>Current departments</b><span>{market.departments.length}</span></div>
            <div className="market-taxonomy-list">
              {market.departments.map((item) => (
                <article key={item.id}>
                  <span><b>{item.name}</b><small>{item.categories.length} categories</small></span>
                  <button type="button" className="secondary" onClick={() => editDepartment(item)}><Pencil /> Edit</button>
                  <button type="button" className="secondary danger" onClick={() => deleteDepartment(item)}><Trash2 /> Delete</button>
                </article>
              ))}
              {!market.departments.length && <p>No departments yet.</p>}
            </div>
          </form>
        ) : (
          <div className="admin-management-card market-quick-form">
            <div><span className="catalog-kicker">CATALOG STRUCTURE</span><h2>Simple catalog</h2></div>
            <p>Departments are optional for this store type. Admin only manages categories.</p>
          </div>
        )}
        <form className="admin-management-card market-quick-form" onSubmit={saveCategory}>
          <div><span className="catalog-kicker">CATALOG STRUCTURE</span><h2>{categoryForm.id ? "Edit category" : "Add category"}</h2></div>
          {market.capabilities.departmentsEnabled ? (
            <select value={categoryDepartmentId} onChange={(event) => setCategoryDepartmentId(event.target.value)} required>
              <option value="">Choose department</option>
              {market.departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          ) : null}
          <div className="market-inline-fields">
            <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Beverages" required minLength={2} />
            <button type="submit"><Plus /> {categoryForm.id ? "Save" : "Add"}</button>
          </div>
          <input value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description, optional" />
          {categoryForm.id ? <button type="button" className="secondary market-cancel-edit" onClick={() => setCategoryForm({ id: "", name: "", description: "" })}>Cancel editing</button> : null}
          <div className="market-taxonomy-title"><b>Current categories</b><span>{allCategories.length}</span></div>
          <div className="market-taxonomy-list">
            {allCategories.map((category) => (
              <article key={category.id}>
                <span><b>{category.name}</b><small>{market.capabilities.departmentsEnabled ? category.department.name : "Category"}</small></span>
                <button type="button" className="secondary" onClick={() => editCategory(category)}><Pencil /> Edit</button>
                <button type="button" className="secondary danger" onClick={() => deleteCategory(category)}><Trash2 /> Delete</button>
              </article>
            ))}
            {!market.departments.some((department) => department.categories.length) && <p>No categories yet.</p>}
          </div>
        </form>
      </section>

      {(message || error) && <div className={error ? "form-error market-engine-message" : "form-success market-engine-message"}>{error || message}</div>}

      <section className="market-engine-main">
        <form id="market-product-editor" className="admin-management-card market-product-editor" onSubmit={saveProduct}>
          <div className="panel-head">
            <span><PackagePlus /></span>
            <div><span className="catalog-kicker">RETAIL PRODUCT</span><h2>{product.id ? "Edit product" : "Add product"}</h2><p>Product settings follow the {market.storeTypeName} store type.</p></div>
          </div>
          <div className="market-form-grid">
            <label>Product name<input value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} required /></label>
            {market.capabilities.brandsEnabled ? <label>Brand<input value={product.brand} onChange={(event) => setProduct({ ...product, brand: event.target.value })} placeholder="Optional" /></label> : null}
            {market.capabilities.departmentsEnabled ? <label>Department<select value={product.departmentId} onChange={(event) => {
              const departmentId = event.target.value;
              const firstCategory = market.departments.find((item) => item.id === departmentId)?.categories[0]?.id ?? "";
              setProduct({ ...product, departmentId, categoryId: firstCategory });
            }} required><option value="">Choose department</option>{market.departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : null}
            <label>Category<select value={product.categoryId} onChange={(event) => setProduct({ ...product, categoryId: event.target.value })} required><option value="">Choose category</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Price (RWF)<input type="number" min="0" value={product.priceRwf} onChange={(event) => setProduct({ ...product, priceRwf: event.target.value })} required /></label>
            <label>Container per quantity<input type="number" min="0" value={product.containerChargePerUnitRwf} onChange={(event) => setProduct({ ...product, containerChargePerUnitRwf: event.target.value })} /></label>
            <label>Container once<input type="number" min="0" value={product.containerChargeFlatRwf} onChange={(event) => setProduct({ ...product, containerChargeFlatRwf: event.target.value })} /></label>
            {market.capabilities.stockTrackingRequired ? <label>Stock quantity<input type="number" min="0" step="0.01" value={product.stockQuantity} onChange={(event) => setProduct({ ...product, stockQuantity: event.target.value })} required /></label> : null}
            {market.capabilities.productUnitsEnabled ? <label>Unit label<input value={product.unitLabel} onChange={(event) => setProduct({ ...product, unitLabel: event.target.value })} placeholder="500 ml, 1 kg, Each" required /></label> : null}
            {hasOptionalField("sku") ? <label>SKU<input value={product.sku} onChange={(event) => setProduct({ ...product, sku: event.target.value })} placeholder="Optional" /></label> : null}
            {hasOptionalField("description") ? <label className="market-span-2">Description<textarea rows={3} value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} /></label> : null}
            <label>Availability<select value={product.isAvailable ? "yes" : "no"} onChange={(event) => setProduct({ ...product, isAvailable: event.target.value === "yes" })}><option value="yes">Available</option><option value="no">Unavailable</option></select></label>
            {hasOptionalField("featured") ? <label>Featured<select value={product.featured ? "yes" : "no"} onChange={(event) => setProduct({ ...product, featured: event.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select></label> : null}
            {hasOptionalField("image") ? <AdminImageUpload label="Product image" purpose="product" value={product.imageUrl} onChange={(imageUrl, imagePublicId) => setProduct({ ...product, imageUrl, imagePublicId: imagePublicId ?? product.imagePublicId })} /> : null}
          </div>
          {market.capabilities.ageConfirmationRequired ? <p className="warning">Customers must confirm the required age before ordering products from this store type.</p> : null}
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
                <Image src={productImage(item.imageUrl, { catalogEngine: "MARKETPLACE", productName: item.name })} alt="" width={64} height={64} />
                <div><b>{item.name}</b><small>{item.category.name}{market.capabilities.productUnitsEnabled ? ` · ${unit?.label ?? "Each"}` : ""}</small><span>{formatRwf(unit?.priceRwf ?? 0)}{market.capabilities.stockTrackingRequired ? ` · Stock ${item.inventory?.stockQuantity ?? 0}` : ""}</span></div>
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
