"use client";

/* Selecting a menu entity intentionally synchronizes its dependent editor forms. */
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Plus, Save, Trash2, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRwf } from "@/lib/money";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";

type MenuStore = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isOpen: boolean;
  restaurantCategories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    _count: { products: number };
  }>;
  restaurantAddOns: Array<{
    id: string;
    name: string;
    category: string | null;
    priceRwf: number;
    description: string | null;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    sortOrder: number;
    isAvailable: boolean;
    groupName?: string | null;
    groupSelectionMode?: "SINGLE" | "MULTIPLE";
    selectionMode: "SINGLE" | "MULTIPLE";
    options: Array<{
      id: string;
      name: string;
      priceAdjustmentRwf: number;
      isAvailable: boolean;
      sortOrder: number;
    }>;
  }>;
  restaurantProducts: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    basePriceRwf: number;
    containerChargePerUnitRwf: number;
    containerChargeFlatRwf: number;
    imageUrl: string | null;
    imagePublicId?: string | null;
    isAvailable: boolean;
    categoryId: string;
    category: { id: string; name: string; slug: string };
    variants: Array<{
      id: string;
      name: string;
      priceRwf: number;
      isDefault: boolean;
      isAvailable: boolean;
      sortOrder: number;
    }>;
    choiceGroups: Array<{
      id: string;
      name: string;
      required: boolean;
      minChoices: number;
      maxChoices: number;
      sortOrder: number;
      options: Array<{
        id: string;
        name: string;
        priceAdjustmentRwf: number;
        isAvailable: boolean;
        sortOrder: number;
      }>;
    }>;
    addOns: Array<{
      id: string;
      name: string;
      priceRwf: number;
      category: string | null;
      description: string | null;
      required: boolean;
      minSelections: number;
      maxSelections: number;
      sortOrder: number;
      groupName?: string | null;
      groupSelectionMode?: "SINGLE" | "MULTIPLE";
      requiredOverride?: boolean | null;
      minSelectionsOverride?: number | null;
      maxSelectionsOverride?: number | null;
      hiddenOptionIds?: unknown;
      optionPriceOverrides?: unknown;
      isAvailable: boolean;
      options: Array<{
        id: string;
        name: string;
        priceAdjustmentRwf: number;
        isAvailable: boolean;
        sortOrder: number;
      }>;
    }>;
  }>;
};

const emptyCategory = () => ({
  id: "",
  storeId: "",
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
});

const emptyProduct = () => ({
  id: "",
  storeId: "",
  categoryId: "",
  name: "",
  slug: "",
  description: "",
  basePriceRwf: "0",
  containerChargePerUnitRwf: "0",
  containerChargeFlatRwf: "0",
  imageUrl: "",
  imagePublicId: "",
  isAvailable: true,
});

const emptyVariant = () => ({
  id: "",
  productId: "",
  name: "",
  priceRwf: "0",
  isDefault: false,
  isAvailable: true,
  sortOrder: "0",
});

const emptyGroup = () => ({
  id: "",
  productId: "",
  name: "",
  required: false,
  minChoices: "0",
  maxChoices: "1",
  sortOrder: "0",
});

const emptyOption = () => ({
  id: "",
  groupId: "",
  name: "",
  priceAdjustmentRwf: "0",
  isAvailable: true,
  sortOrder: "0",
});

const emptyAddOn = () => ({
  id: "",
  storeId: "",
  name: "",
  category: "",
  description: "",
  priceRwf: "0",
  selectionMode: "SINGLE" as "SINGLE" | "MULTIPLE",
  required: false,
  minSelections: "0",
  maxSelections: "1",
  sortOrder: "0",
  isAvailable: true,
});

const emptyAddOnOption = () => ({
  id: "",
  addOnId: "",
  name: "",
  priceAdjustmentRwf: "0",
  isAvailable: true,
  sortOrder: "0",
});

function isBlank(value: string) {
  return value.trim().length === 0;
}

async function postMenu(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/restaurant-menu", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Could not save menu item.");
  }
}

export function AdminRestaurantMenuBuilder({ stores }: { stores: MenuStore[] }) {
  const router = useRouter();
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? "");
  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null,
    [selectedStoreId, stores],
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    selectedStore?.restaurantProducts[0]?.id ?? "",
  );
  const selectedProduct = useMemo(
    () =>
      selectedStore?.restaurantProducts.find((product) => product.id === selectedProductId) ??
      selectedStore?.restaurantProducts[0] ??
      null,
    [selectedStore, selectedProductId],
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    selectedProduct?.choiceGroups[0]?.id ?? "",
  );
  const selectedGroup = useMemo(
    () =>
      selectedProduct?.choiceGroups.find((group) => group.id === selectedGroupId) ??
      selectedProduct?.choiceGroups[0] ??
      null,
    [selectedGroupId, selectedProduct],
  );
  const [selectedAddOnId, setSelectedAddOnId] = useState<string>("");
  const selectedAddOn = useMemo(
    () =>
      selectedStore?.restaurantAddOns.find((addOn) => addOn.id === selectedAddOnId) ??
      selectedStore?.restaurantAddOns[0] ??
      null,
    [selectedAddOnId, selectedStore],
  );
  const [selectedAddOnOptionId, setSelectedAddOnOptionId] = useState<string>("");
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [variantForm, setVariantForm] = useState(emptyVariant);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [optionForm, setOptionForm] = useState(emptyOption);
  const [addOnForm, setAddOnForm] = useState(emptyAddOn);
  const [addOnOptionForm, setAddOnOptionForm] = useState(emptyAddOnOption);
  const [bulkAddOnId, setBulkAddOnId] = useState("");
  const [bulkAddOnGroupName, setBulkAddOnGroupName] = useState("");
  const [bulkAddOnGroupMode, setBulkAddOnGroupMode] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [bulkAddOnTargetProductIds, setBulkAddOnTargetProductIds] = useState<string[]>([]);
  const [bulkAddOnSearch, setBulkAddOnSearch] = useState("");
  const [productAddOnGroupName, setProductAddOnGroupName] = useState("");
  const [productAddOnGroupMode, setProductAddOnGroupMode] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [productAddOnRequired, setProductAddOnRequired] = useState(false);
  const [productAddOnMinSelections, setProductAddOnMinSelections] = useState("0");
  const [productAddOnMaxSelections, setProductAddOnMaxSelections] = useState("1");
  const [productAddOnHiddenOptionIds, setProductAddOnHiddenOptionIds] = useState<string[]>([]);
  const [productAddOnOptionPriceOverrides, setProductAddOnOptionPriceOverrides] = useState<Record<string, string>>({});
  const [selectedProductAddOnId, setSelectedProductAddOnId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const copyGroupTargets = useMemo(
    () => selectedStore?.restaurantProducts.filter((product) => product.id !== selectedProduct?.id) ?? [],
    [selectedProduct?.id, selectedStore],
  );
  const [copyGroupTargetProductIds, setCopyGroupTargetProductIds] = useState<string[]>([]);
  const [copyGroupSearch, setCopyGroupSearch] = useState("");
  const [groupTemplateSearch, setGroupTemplateSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedStore) return;
    setCategoryForm({
      ...emptyCategory(),
      storeId: selectedStore.id,
    });
    setAddOnForm({
      ...emptyAddOn(),
      storeId: selectedStore.id,
    });
    if (!selectedStore.restaurantProducts.length) {
      setSelectedProductId("");
      setSelectedCategoryId("");
      setProductForm({
        ...emptyProduct(),
        storeId: selectedStore.id,
        categoryId: selectedStore.restaurantCategories[0]?.id ?? "",
      });
      return;
    }
    const firstProduct = selectedStore.restaurantProducts.find((product) => product.id === selectedProductId) ??
      selectedStore.restaurantProducts[0];
    setSelectedProductId(firstProduct.id);
    setSelectedCategoryId(firstProduct.categoryId);
    setProductForm({
      id: firstProduct.id,
      storeId: selectedStore.id,
      categoryId: firstProduct.categoryId,
      name: firstProduct.name,
      slug: firstProduct.slug,
      description: firstProduct.description ?? "",
      basePriceRwf: String(firstProduct.basePriceRwf),
      containerChargePerUnitRwf: String(firstProduct.containerChargePerUnitRwf ?? 0),
      containerChargeFlatRwf: String(firstProduct.containerChargeFlatRwf ?? 0),
      imageUrl: firstProduct.imageUrl ?? "",
      imagePublicId: firstProduct.imagePublicId ?? "",
      isAvailable: firstProduct.isAvailable,
    });
  }, [selectedStoreId, selectedStore, selectedProductId]);

  useEffect(() => {
    if (!selectedStore || !selectedProduct) return;
    setProductForm({
      id: selectedProduct.id,
      storeId: selectedStore.id,
      categoryId: selectedProduct.categoryId,
      name: selectedProduct.name,
      slug: selectedProduct.slug,
      description: selectedProduct.description ?? "",
      basePriceRwf: String(selectedProduct.basePriceRwf),
      containerChargePerUnitRwf: String(selectedProduct.containerChargePerUnitRwf ?? 0),
      containerChargeFlatRwf: String(selectedProduct.containerChargeFlatRwf ?? 0),
      imageUrl: selectedProduct.imageUrl ?? "",
      imagePublicId: selectedProduct.imagePublicId ?? "",
      isAvailable: selectedProduct.isAvailable,
    });
    setVariantForm({
      ...emptyVariant(),
      productId: selectedProduct.id,
    });
    setGroupForm({
      ...emptyGroup(),
      productId: selectedProduct.id,
    });
    setSelectedGroupId((current) => {
      const existingGroup = selectedProduct.choiceGroups.find((group) => group.id === current);
      return existingGroup?.id ?? selectedProduct.choiceGroups[0]?.id ?? "";
    });
  }, [selectedProductId, selectedStore, selectedProduct]);

  useEffect(() => {
    if (!selectedGroup) return;
    setOptionForm({
      ...emptyOption(),
      groupId: selectedGroup.id,
    });
  }, [selectedGroupId, selectedGroup]);

  useEffect(() => {
    if (!selectedStore) return;
    const firstAddOn = selectedStore.restaurantAddOns.find((addOn) => addOn.id === selectedAddOnId) ??
      selectedStore.restaurantAddOns[0];
    setSelectedAddOnId(firstAddOn?.id ?? "");
    setAddOnOptionForm((current) => ({
      ...current,
      addOnId: firstAddOn?.id ?? "",
    }));
  }, [selectedStoreId, selectedStore, selectedAddOnId]);

  useEffect(() => {
    if (!selectedAddOn) {
      setSelectedAddOnOptionId("");
      return;
    }
    const firstOption = selectedAddOn.options.find((option) => option.id === selectedAddOnOptionId) ??
      selectedAddOn.options[0];
    setSelectedAddOnOptionId(firstOption?.id ?? "");
    setAddOnOptionForm((current) => ({
      ...current,
      addOnId: selectedAddOn.id,
    }));
  }, [selectedAddOn, selectedAddOnOptionId]);

  useEffect(() => {
    if (!copyGroupTargets.length) {
      setCopyGroupTargetProductIds([]);
      return;
    }
    setCopyGroupTargetProductIds((current) =>
      current.filter((id) => copyGroupTargets.some((product) => product.id === id)),
    );
  }, [copyGroupTargets]);

  useEffect(() => {
    const availableAddOnIds = selectedStore?.restaurantAddOns.map((addOn) => addOn.id) ?? [];
    if (!availableAddOnIds.length) {
      setBulkAddOnId("");
      return;
    }
    setBulkAddOnId((current) => (availableAddOnIds.includes(current) ? current : availableAddOnIds[0]));
  }, [selectedStore?.restaurantAddOns]);

  useEffect(() => {
    const availableProductIds = selectedStore?.restaurantProducts.map((product) => product.id) ?? [];
    if (!availableProductIds.length) {
      setBulkAddOnTargetProductIds([]);
      return;
    }
    setBulkAddOnTargetProductIds((current) =>
      current.filter((id) => availableProductIds.includes(id)),
    );
  }, [selectedStore?.restaurantProducts]);

  async function mutate(
    payload: Record<string, unknown>,
    successMessage: string,
  ) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await postMenu(payload);
      setMessage(successMessage);
      router.refresh();
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : "Could not save menu item.";
      setError(message);
      window.alert(message);
    } finally {
      setSaving(false);
    }
  }

  const storeOptions = selectedStore?.restaurantCategories ?? [];
  const addOnLinks = selectedProduct?.addOns ?? [];
  const storeGroupTemplates = useMemo(
    () =>
      selectedStore?.restaurantProducts.flatMap((product) =>
        product.choiceGroups.map((group) => ({
          ...group,
          sourceProductId: product.id,
          sourceProductName: product.name,
        })),
      ) ?? [],
    [selectedStore],
  );
  const filteredGroupTemplates = useMemo(
    () =>
      storeGroupTemplates.filter((group) => {
        if (group.sourceProductId === selectedProduct?.id) return false;
        if (selectedCategoryId && group.sourceProductId) {
          const sourceProduct = selectedStore?.restaurantProducts.find((product) => product.id === group.sourceProductId);
          if (sourceProduct && sourceProduct.categoryId !== selectedCategoryId) return false;
        }
        const haystack = `${group.name} ${group.sourceProductName}`.toLowerCase();
        return haystack.includes(groupTemplateSearch.trim().toLowerCase());
      }),
    [groupTemplateSearch, selectedCategoryId, selectedProduct?.id, selectedStore?.restaurantProducts, storeGroupTemplates],
  );
  const filteredCopyGroupTargets = useMemo(
    () =>
      copyGroupTargets.filter((product) => {
        if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
        const haystack = `${product.name} ${product.category.name} ${product.slug}`.toLowerCase();
        return haystack.includes(copyGroupSearch.trim().toLowerCase());
      }),
    [copyGroupSearch, copyGroupTargets, selectedCategoryId],
  );
  const filteredBulkAddOnProducts = useMemo(
    () =>
      (selectedStore?.restaurantProducts ?? []).filter((product) => {
        if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
        const haystack = `${product.name} ${product.category.name} ${product.slug}`.toLowerCase();
        return haystack.includes(bulkAddOnSearch.trim().toLowerCase());
      }),
    [bulkAddOnSearch, selectedCategoryId, selectedStore?.restaurantProducts],
  );
  const filteredProducts = useMemo(
    () =>
      (selectedStore?.restaurantProducts ?? []).filter((product) => {
        if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
        const haystack = `${product.name} ${product.category.name} ${product.slug}`.toLowerCase();
        return haystack.includes(productSearch.trim().toLowerCase());
      }),
    [productSearch, selectedCategoryId, selectedStore?.restaurantProducts],
  );
  const selectedProductAddOnGroups = useMemo(() => {
    const addOns = selectedProduct?.addOns ?? [];
    const grouped = new Map<string, typeof addOns>();
    for (const addOn of addOns) {
      const groupName = addOn.groupName?.trim() || addOn.name;
      const bucket = grouped.get(groupName) ?? [];
      bucket.push(addOn);
      grouped.set(groupName, bucket);
    }
    return [...grouped.entries()]
      .map(([groupName, items]) => {
        const first = items[0];
        return {
          groupName,
          items: items.slice().sort((a, b) => a.name.localeCompare(b.name)),
          selectionMode: first?.groupSelectionMode ?? "SINGLE",
          required: first?.requiredOverride ?? first?.required ?? false,
          minSelections: first?.minSelectionsOverride ?? first?.minSelections ?? 0,
          maxSelections: first?.maxSelectionsOverride ?? first?.maxSelections ?? 1,
          hiddenOptionIds: first?.hiddenOptionIds,
          optionPriceOverrides: first?.optionPriceOverrides,
        };
      })
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [selectedProduct?.addOns]);
  const selectedProductLinkedAddOn = useMemo(
    () =>
      selectedProduct?.addOns.find((addOn) => addOn.id === selectedProductAddOnId) ??
      selectedProduct?.addOns[0] ??
      null,
    [selectedProduct, selectedProductAddOnId],
  );

  useEffect(() => {
    if (!selectedProduct) return;
    const firstGroup = selectedProductAddOnGroups[0];
    setProductAddOnGroupName(firstGroup?.groupName ?? "AddOns");
    setProductAddOnGroupMode(firstGroup?.selectionMode ?? "SINGLE");
    setProductAddOnRequired(firstGroup?.required ?? false);
    setProductAddOnMinSelections(String(firstGroup?.minSelections ?? 0));
    setProductAddOnMaxSelections(String(firstGroup?.maxSelections ?? 1));
    setProductAddOnHiddenOptionIds(
      Array.isArray(firstGroup?.hiddenOptionIds) ? firstGroup.hiddenOptionIds : [],
    );
    setProductAddOnOptionPriceOverrides(
      firstGroup?.optionPriceOverrides &&
        typeof firstGroup.optionPriceOverrides === "object" &&
        !Array.isArray(firstGroup.optionPriceOverrides)
        ? Object.fromEntries(
            Object.entries(firstGroup.optionPriceOverrides as Record<string, unknown>).map(
              ([key, value]) => [key, String(value)],
            ),
          )
        : {},
    );
    setSelectedProductAddOnId(firstGroup?.items[0]?.id ?? "");
  }, [selectedProduct?.id]);
  const groupedAddOns = useMemo(() => {
    const addOns = selectedStore?.restaurantAddOns ?? [];
    const grouped = new Map<string, typeof addOns>();
    for (const addOn of addOns) {
      const category = addOn.category?.trim() || "General";
      const bucket = grouped.get(category) ?? [];
      bucket.push(addOn);
      grouped.set(category, bucket);
    }
    return [...grouped.entries()]
      .map(([category, items]) => ({
        category,
        items: items.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [selectedStore?.restaurantAddOns]);

  return (
    <section className="menu-builder-shell">
      <div className="menu-builder-sidebar">
        <div className="admin-management-card">
          <div className="panel-head">
            <span>
              <Store />
            </span>
            <div>
              <span className="catalog-kicker">RESTAURANT STORES</span>
              <h2>Select a restaurant</h2>
              <p>Choose the store you want to build menus for.</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  setSelectedStoreId(store.id);
                  const firstCategoryId = store.restaurantCategories[0]?.id ?? "";
                  setSelectedCategoryId(firstCategoryId);
                  const firstStoreProduct =
                    store.restaurantProducts.find((product) => product.categoryId === firstCategoryId) ??
                    store.restaurantProducts[0];
                  setSelectedProductId(firstStoreProduct?.id ?? "");
                }}
                className="menu-store-card"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "14px",
                  textAlign: "left",
                  background: selectedStoreId === store.id ? "#eef4eb" : "#fff",
                }}
              >
                <b style={{ display: "block" }}>{store.name}</b>
                <small style={{ color: "var(--muted)" }}>
                  {store.isOpen ? "Open" : "Closed"} · {store.status}
                </small>
                <small style={{ color: "var(--muted)" }}>
                  {store.restaurantProducts.length} products · {store.restaurantCategories.length} categories
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-management-card" style={{ marginTop: "16px" }}>
          <div className="panel-head">
            <span>Cat</span>
            <div>
              <span className="catalog-kicker">CATEGORIES</span>
              <h2>Manage restaurant categories</h2>
              <p>Categories are store-specific.</p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedStore) return;
              if (isBlank(categoryForm.name)) {
                setError("Category name is required.");
                return;
              }
              mutate(
                {
                  entity: "category",
                  action: "save",
                  id: categoryForm.id || undefined,
                  storeId: selectedStore.id,
                  name: categoryForm.name,
                  slug: categoryForm.slug,
                  description: categoryForm.description,
                  sortOrder: Number(categoryForm.sortOrder),
                },
                "Category saved.",
              );
            }}
          >
            <div className="menu-builder-grid">
              <label>
                Name
                <input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Breakfast"
                />
              </label>
              <label>
                Slug
                <input
                  value={categoryForm.slug}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="breakfast"
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Description
                <input
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Menu category description"
                />
              </label>
            </div>
            <div className="menu-builder-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? <LoaderCircle className="spin" /> : <Save />}
                Save category
              </button>
              <button type="button" className="secondary" onClick={() => setCategoryForm({
                ...emptyCategory(),
                storeId: selectedStore?.id ?? "",
              })}>
                <Plus /> New category
              </button>
            </div>
          </form>

          <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
            {selectedStore?.restaurantCategories.map((category) => (
              <article
                key={category.id}
                className="menu-record-card"
                style={{
                  cursor: "pointer",
                  borderColor: selectedCategoryId === category.id ? "var(--green)" : undefined,
                  background: selectedCategoryId === category.id ? "#eef5ea" : undefined,
                }}
                onClick={() => {
                  setSelectedCategoryId(category.id);
                }}
              >
                <div>
                  <b>{category.name}</b>
                  <small>{category.slug} · {category._count.products} products</small>
                </div>
                <div className="menu-record-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCategoryForm({
                        id: category.id,
                        storeId: selectedStore.id,
                        name: category.name,
                        slug: category.slug,
                        description: category.description ?? "",
                        sortOrder: String(category.sortOrder),
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      mutate(
                        {
                          entity: "category",
                          action: "delete",
                          id: category.id,
                        },
                        "Category deleted.",
                      );
                    }}
                  >
                    <Trash2 /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <section className="admin-management-card" style={{ marginTop: "16px", maxHeight: "260px", overflowY: "auto" }}>
          <div className="panel-head">
            <span>Reuse</span>
            <div>
              <span className="catalog-kicker">QUICK GROUP TEMPLATES</span>
              <h2>Reuse a saved choice group</h2>
              <p>Search and copy a group like â€œChoice of Eggsâ€ without leaving the sidebar.</p>
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--muted)", fontSize: "11px", fontWeight: 700 }}>
            Search saved groups
            <input
              value={groupTemplateSearch}
              onChange={(event) => setGroupTemplateSearch(event.target.value)}
              placeholder="Search by group name or source product"
            />
          </label>

          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
            {filteredGroupTemplates.slice(0, 6).map((group) => (
              <article key={group.id} className="menu-record-card" style={{ padding: "11px 12px" }}>
                <div>
                  <b>{group.name}</b>
                  <small>From {group.sourceProductName} · {group.options.length} options</small>
                </div>
                <div className="menu-record-actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={saving || !selectedProduct}
                    onClick={() =>
                      mutate(
                        {
                          entity: "choice-group-copy",
                          sourceGroupId: group.id,
                          targetProductId: selectedProduct?.id,
                        },
                        `Copied ${group.name}.`,
                      )
                    }
                  >
                    Copy
                  </button>
                </div>
              </article>
            ))}
            {!filteredGroupTemplates.length && (
              <p style={{ color: "var(--muted)", margin: 0 }}>
                {groupTemplateSearch.trim()
                  ? "No saved groups match your search."
                  : "No saved groups available to reuse yet."}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="menu-builder-main">
        <div className="admin-management-card">
          <div className="panel-head">
            <span>Prod</span>
            <div>
              <span className="catalog-kicker">PRODUCTS</span>
              <h2>Restaurant product editor</h2>
              <p>Create and update menu items with the right category and price.</p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedStore) return;
              if (isBlank(productForm.name) || isBlank(productForm.categoryId)) {
                setError("Product name and category are required.");
                return;
              }
              mutate(
                {
                  entity: "product",
                  action: "save",
                  id: productForm.id || undefined,
                  storeId: selectedStore.id,
                  categoryId: productForm.categoryId,
                  name: productForm.name,
                  slug: productForm.slug,
                  description: productForm.description,
                  basePriceRwf: Number(productForm.basePriceRwf),
                  containerChargePerUnitRwf: Number(productForm.containerChargePerUnitRwf),
                  containerChargeFlatRwf: Number(productForm.containerChargeFlatRwf),
                  imageUrl: productForm.imageUrl,
                  imagePublicId: productForm.imagePublicId,
                  isAvailable: productForm.isAvailable,
                },
                "Product saved.",
              );
            }}
          >
            <div className="menu-builder-grid">
              <label>
                Name
                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Java Continental Breakfast"
                />
              </label>
              <label>
                Slug
                <input
                  value={productForm.slug}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="java-continental-breakfast"
                />
              </label>
              <label>
                Category
                <select
                  value={productForm.categoryId}
                  onChange={(event) => {
                    const nextCategoryId = event.target.value;
                    setProductForm((current) => ({ ...current, categoryId: nextCategoryId }));
                    setSelectedCategoryId(nextCategoryId);
                  }}
                >
                  <option value="">Choose category</option>
                  {storeOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Base price
                <input
                  type="number"
                  value={productForm.basePriceRwf}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, basePriceRwf: event.target.value }))
                  }
                />
              </label>
              <label>
                Container per quantity
                <input
                  type="number"
                  min="0"
                  value={productForm.containerChargePerUnitRwf}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, containerChargePerUnitRwf: event.target.value }))
                  }
                />
              </label>
              <label>
                Container once
                <input
                  type="number"
                  min="0"
                  value={productForm.containerChargeFlatRwf}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, containerChargeFlatRwf: event.target.value }))
                  }
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Description
                <input
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the item and the default serving"
                />
              </label>
              <AdminImageUpload
                label="Product image"
                purpose="product"
                value={productForm.imageUrl}
                onChange={(imageUrl, imagePublicId) =>
                  setProductForm((current) => ({
                    ...current,
                    imageUrl,
                    imagePublicId: imagePublicId ?? current.imagePublicId,
                  }))
                }
                help="Choose a clear product photo from your computer or phone."
              />
              <label>
                Availability
                <select
                  value={productForm.isAvailable ? "yes" : "no"}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, isAvailable: event.target.value === "yes" }))
                  }
                >
                  <option value="yes">Available</option>
                  <option value="no">Unavailable</option>
                </select>
              </label>
            </div>
            <div className="menu-builder-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? <LoaderCircle className="spin" /> : <Save />}
                Save product
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setProductForm({
                  ...emptyProduct(),
                  storeId: selectedStore?.id ?? "",
                  categoryId: selectedCategoryId || selectedStore?.restaurantCategories[0]?.id || "",
                })}
              >
                <Plus /> New product
              </button>
            </div>
          </form>

          <div className="menu-builder-grid" style={{ marginTop: "14px" }}>
            <label style={{ gridColumn: "1 / -1" }}>
              Search products
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search by name, category, or slug"
              />
            </label>
          </div>

          {selectedCategoryId && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", marginBottom: "8px" }}>
              <span className="catalog-kicker">FILTERED CATEGORY</span>
              <b>{selectedStore?.restaurantCategories.find((category) => category.id === selectedCategoryId)?.name}</b>
              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedCategoryId("")}
                style={{ height: "36px" }}
              >
                Clear filter
              </button>
            </div>
          )}

          <div style={{ marginTop: "10px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
                gap: "10px",
                padding: "10px 12px",
                color: "var(--muted)",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <span>Product</span>
              <span style={{ textAlign: "center" }}>Open</span>
              <span style={{ textAlign: "center" }}>Edit</span>
              <span style={{ textAlign: "center" }}>Delete</span>
            </div>

            <div
              style={{
                display: "grid",
                gap: "8px",
                maxHeight: "340px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
                    gap: "10px",
                    alignItems: "center",
                    border: "1px solid var(--line)",
                    borderRadius: "14px",
                    background: "#fff",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <b style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {product.name}
                    </b>
                    <small style={{ display: "block", color: "var(--muted)", marginTop: "3px" }}>
                      {product.category.name} · {formatRwf(product.basePriceRwf)}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(product.categoryId);
                      setSelectedProductId(product.id);
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm({
                        id: product.id,
                        storeId: selectedStore.id,
                        categoryId: product.categoryId,
                        name: product.name,
                        slug: product.slug,
                        description: product.description ?? "",
                        basePriceRwf: String(product.basePriceRwf),
                        containerChargePerUnitRwf: String(product.containerChargePerUnitRwf ?? 0),
                        containerChargeFlatRwf: String(product.containerChargeFlatRwf ?? 0),
                        imageUrl: product.imageUrl ?? "",
                        imagePublicId: product.imagePublicId ?? "",
                        isAvailable: product.isAvailable,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mutate(
                        {
                          entity: "product",
                          action: "delete",
                          id: product.id,
                        },
                        "Product deleted.",
                      )
                    }
                  >
                    <Trash2 /> Delete
                  </button>
                </article>
              ))}
              {!filteredProducts.length && (
                <p style={{ color: "var(--muted)", margin: 0 }}>
                  {productSearch.trim()
                    ? "No products match your search."
                    : "No products available in this store yet."}
                </p>
              )}
            </div>
          </div>

          <div
            style={{ display: "none" }}
          >
            {filteredProducts.map((product) => (
              <article key={product.id} className="menu-record-card">
                <div>
                  <b>{product.name}</b>
                  <small>
                    {product.category.name} · {formatRwf(product.basePriceRwf)}
                  </small>
                </div>
                <div className="menu-record-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(product.categoryId);
                      setSelectedProductId(product.id);
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm({
                        id: product.id,
                        storeId: selectedStore.id,
                        categoryId: product.categoryId,
                        name: product.name,
                        slug: product.slug,
                        description: product.description ?? "",
                        basePriceRwf: String(product.basePriceRwf),
                        containerChargePerUnitRwf: String(product.containerChargePerUnitRwf ?? 0),
                        containerChargeFlatRwf: String(product.containerChargeFlatRwf ?? 0),
                        imageUrl: product.imageUrl ?? "",
                        imagePublicId: product.imagePublicId ?? "",
                        isAvailable: product.isAvailable,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mutate(
                        {
                          entity: "product",
                          action: "delete",
                          id: product.id,
                        },
                        "Product deleted.",
                      )
                    }
                  >
                    <Trash2 /> Delete
                  </button>
                </div>
              </article>
            ))}
            {!filteredProducts.length && (
              <p style={{ color: "var(--muted)", margin: 0 }}>
                {productSearch.trim()
                  ? "No products match your search."
                  : "No products available in this store yet."}
              </p>
            )}
          </div>
        </div>

        {selectedProduct && selectedStore && (
          <div className="admin-management-card" style={{ marginTop: "16px" }}>
            <div className="panel-head">
              <span>Build</span>
              <div>
                <span className="catalog-kicker">PRODUCT STRUCTURE</span>
                <h2>{selectedProduct.name}</h2>
                <p>
                  Add variants, required choices, optional choices, and add-ons for the detail page.
                </p>
              </div>
            </div>

            <div className="structure-grid">
              <section>
                <h3>Variants</h3>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (isBlank(variantForm.name)) {
                      setError("Variant name is required.");
                      return;
                    }
                    mutate(
                      {
                        entity: "variant",
                        action: "save",
                        id: variantForm.id || undefined,
                        productId: selectedProduct.id,
                        name: variantForm.name,
                        priceRwf: Number(variantForm.priceRwf),
                        isDefault: variantForm.isDefault,
                        isAvailable: variantForm.isAvailable,
                        sortOrder: Number(variantForm.sortOrder),
                      },
                      "Variant saved.",
                    );
                  }}
                >
                  <div className="menu-builder-grid">
                    <label>
                      Name
                      <input
                        value={variantForm.name}
                        onChange={(event) =>
                          setVariantForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="5pcs"
                      />
                    </label>
                    <label>
                      Price
                      <input
                        type="number"
                        value={variantForm.priceRwf}
                        onChange={(event) =>
                          setVariantForm((current) => ({ ...current, priceRwf: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Default
                      <select
                        value={variantForm.isDefault ? "yes" : "no"}
                        onChange={(event) =>
                          setVariantForm((current) => ({
                            ...current,
                            isDefault: event.target.value === "yes",
                          }))
                        }
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </label>
                  </div>
                  <div className="menu-builder-actions">
                    <button type="submit" className="primary" disabled={saving}>
                      {saving ? <LoaderCircle className="spin" /> : <Save />}
                      Save variant
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setVariantForm({
                          ...emptyVariant(),
                          productId: selectedProduct.id,
                        })
                      }
                    >
                      <Plus /> New variant
                    </button>
                  </div>
                </form>
                <div className="menu-item-list">
                  {selectedProduct.variants.map((variant) => (
                    <article key={variant.id} className="menu-record-card">
                      <div>
                        <b>{variant.name}</b>
                        <small>
                          {formatRwf(variant.priceRwf)} · {variant.isDefault ? "Default" : "Extra"}
                        </small>
                      </div>
                      <div className="menu-record-actions">
                        <button type="button" onClick={() => setVariantForm({
                          id: variant.id,
                          productId: selectedProduct.id,
                          name: variant.name,
                          priceRwf: String(variant.priceRwf),
                          isDefault: variant.isDefault,
                          isAvailable: variant.isAvailable,
                          sortOrder: String(variant.sortOrder),
                        })}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            mutate(
                              { entity: "variant", action: "delete", id: variant.id },
                              "Variant deleted.",
                            )
                          }
                        >
                          <Trash2 /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h3>Product choice groups</h3>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (isBlank(groupForm.name)) {
                      setError("Choice group name is required.");
                      return;
                    }
                    mutate(
                      {
                        entity: "choice-group",
                        action: "save",
                        id: groupForm.id || undefined,
                        productId: selectedProduct.id,
                        name: groupForm.name,
                        required: groupForm.required,
                        minChoices: Number(groupForm.minChoices),
                        maxChoices: Number(groupForm.maxChoices),
                        sortOrder: Number(groupForm.sortOrder),
                      },
                      "Choice group saved.",
                    );
                  }}
                >
                  <div className="menu-builder-grid">
                    <label>
                      Name
                      <input
                        value={groupForm.name}
                        onChange={(event) =>
                          setGroupForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Bottle vibe, choice of eggs, accompaniment"
                      />
                    </label>
                    <label>
                      Required
                      <select
                        value={groupForm.required ? "yes" : "no"}
                        onChange={(event) =>
                          setGroupForm((current) => ({
                            ...current,
                            required: event.target.value === "yes",
                          }))
                        }
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </label>
                    <label>
                      Min choices
                      <input
                        type="number"
                        value={groupForm.minChoices}
                        onChange={(event) =>
                          setGroupForm((current) => ({ ...current, minChoices: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Max choices
                      <input
                        type="number"
                        value={groupForm.maxChoices}
                        onChange={(event) =>
                          setGroupForm((current) => ({ ...current, maxChoices: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="menu-builder-actions">
                    <button type="submit" className="primary" disabled={saving}>
                      {saving ? <LoaderCircle className="spin" /> : <Save />}
                      Save group
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setGroupForm({
                          ...emptyGroup(),
                          productId: selectedProduct.id,
                        })
                      }
                    >
                      <Plus /> New group
                    </button>
                  </div>
                </form>

                <div className="menu-item-list">
                  {selectedProduct.choiceGroups.map((group) => (
                    <article key={group.id} className="menu-record-card">
                      <div>
                        <b>{group.name}</b>
                        <small>
                          {group.required ? "Required" : "Optional"} · {group.minChoices} to {group.maxChoices}
                        </small>
                      </div>
                      <div className="menu-record-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            setGroupForm({
                              id: group.id,
                              productId: selectedProduct.id,
                              name: group.name,
                              required: group.required,
                              minChoices: String(group.minChoices),
                              maxChoices: String(group.maxChoices),
                              sortOrder: String(group.sortOrder),
                            });
                            setOptionForm({ ...emptyOption(), groupId: group.id });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            mutate(
                              { entity: "choice-group", action: "delete", id: group.id },
                              "Choice group deleted.",
                            )
                          }
                        >
                          <Trash2 /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <section
                  className="admin-management-card"
                  style={{ display: "none" }}
                >
                  <div className="panel-head">
                    <span>Quick</span>
                    <div>
                      <span className="catalog-kicker">REUSE EXISTING GROUP</span>
                      <h2>Pick a saved group and use it here</h2>
                      <p>For example: copy â€œChoice of Eggsâ€ with all its options to this product.</p>
                    </div>
                  </div>

                  <div className="menu-builder-grid">
                    <label style={{ gridColumn: "1 / -1" }}>
                      Search saved groups
                      <input
                        value={groupTemplateSearch}
                        onChange={(event) => setGroupTemplateSearch(event.target.value)}
                        placeholder="Search by group name or source product"
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {filteredGroupTemplates.map((group) => (
                      <article
                        key={group.id}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "14px",
                          padding: "12px",
                          background: "#fff",
                        }}
                      >
                        <b style={{ display: "block" }}>{group.name}</b>
                        <small style={{ color: "var(--muted)", display: "block", marginTop: "4px" }}>
                          From {group.sourceProductName}
                        </small>
                        <small style={{ color: "var(--muted)", display: "block", marginTop: "4px" }}>
                          {group.options.length} options · {group.required ? "Required" : "Optional"}
                        </small>
                        <button
                          type="button"
                          className="primary"
                          style={{ marginTop: "12px", width: "100%" }}
                          disabled={saving || !selectedProduct}
                          onClick={() =>
                            mutate(
                              {
                                entity: "choice-group-copy",
                                sourceGroupId: group.id,
                                targetProductId: selectedProduct?.id,
                              },
                              `Copied ${group.name} to ${selectedProduct?.name ?? "this product"}.`,
                            )
                          }
                        >
                          Copy to this product
                        </button>
                      </article>
                    ))}
                    {!filteredGroupTemplates.length && (
                      <p style={{ color: "var(--muted)", margin: 0 }}>
                        {groupTemplateSearch.trim()
                          ? "No saved groups match your search."
                          : "No saved groups available to reuse yet."}
                      </p>
                    )}
                  </div>
                </section>

                <section
                  className="admin-management-card"
                  style={{ display: "none" }}
                >
                  <div className="panel-head">
                    <span>Reuse</span>
                    <div>
                      <span className="catalog-kicker">COPY CHOICE GROUP</span>
                      <h2>Use this group on another product</h2>
                      <p>Duplicate the selected group and its options to another product in this store.</p>
                    </div>
                  </div>

                  {selectedGroup ? (
                    <>
                      <div className="menu-builder-grid">
                        <label>
                          Search products
                          <input
                            value={copyGroupSearch}
                            onChange={(event) => setCopyGroupSearch(event.target.value)}
                            placeholder="Search by name or category"
                          />
                        </label>
                        <label>
                          Selected group
                          <input value={selectedGroup.name} readOnly />
                        </label>
                      </div>
                      {filteredCopyGroupTargets.length ? (
                        <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                            {filteredCopyGroupTargets.map((product) => {
                              const checked = copyGroupTargetProductIds.includes(product.id);
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() =>
                                    setCopyGroupTargetProductIds((current) =>
                                      current.includes(product.id)
                                        ? current.filter((id) => id !== product.id)
                                        : [...current, product.id],
                                    )
                                  }
                                    style={{
                                      border: `1px solid ${checked ? "var(--green)" : "var(--line)"}`,
                                      borderRadius: "14px",
                                      padding: "12px 14px",
                                      textAlign: "left",
                                      background: checked ? "#eef4eb" : "#fff",
                                    }}
                                >
                                  <b style={{ display: "block" }}>{product.name}</b>
                                  <small style={{ color: "var(--muted)" }}>{product.category.name}</small>
                                </button>
                              );
                            })}
                          </div>
                          <div
                            style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}
                          >
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                setCopyGroupTargetProductIds(
                                  filteredCopyGroupTargets.map((product) => product.id),
                                )
                              }
                            >
                              Select all products
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setCopyGroupTargetProductIds([])}
                              disabled={!copyGroupTargetProductIds.length}
                            >
                              Clear selection
                            </button>
                          </div>
                        </>
                      ) : (
                        <p style={{ color: "var(--muted)", margin: "12px 0 0" }}>
                          {copyGroupSearch.trim()
                            ? "No products match your search."
                            : "No other products are available in this store."}
                        </p>
                      )}
                      <div className="menu-builder-actions">
                        <button
                          type="button"
                          className="primary"
                          disabled={saving || !copyGroupTargetProductIds.length}
                          onClick={() =>
                            mutate(
                              {
                                entity: "choice-group-copy",
                                sourceGroupId: selectedGroup.id,
                                targetProductIds: copyGroupTargetProductIds,
                              },
                              copyGroupTargetProductIds.length > 1
                                ? "Choice group copied to selected products."
                                : "Choice group copied.",
                            )
                          }
                        >
                          <Plus /> Copy group
                        </button>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: "var(--muted)", margin: 0 }}>
                      Select a choice group first, then copy it to another product.
                    </p>
                  )}
                </section>

                {selectedGroup && (
                  <div style={{ marginTop: "16px" }}>
                    <h4>{selectedGroup.name} options</h4>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (isBlank(optionForm.name)) {
                          setError("Option name is required.");
                          return;
                        }
                        mutate(
                          {
                            entity: "choice-option",
                            action: "save",
                            id: optionForm.id || undefined,
                            groupId: selectedGroup.id,
                            name: optionForm.name,
                            priceAdjustmentRwf: Number(optionForm.priceAdjustmentRwf),
                            isAvailable: optionForm.isAvailable,
                            sortOrder: Number(optionForm.sortOrder),
                          },
                          "Option saved.",
                        );
                      }}
                    >
                      <div className="menu-builder-grid">
                        <label>
                          Name
                          <input
                            value={optionForm.name}
                            onChange={(event) =>
                              setOptionForm((current) => ({ ...current, name: event.target.value }))
                            }
                            placeholder="Garden Salad"
                          />
                        </label>
                        <label>
                          Price adjustment
                          <input
                            type="number"
                            value={optionForm.priceAdjustmentRwf}
                            onChange={(event) =>
                              setOptionForm((current) => ({
                                ...current,
                                priceAdjustmentRwf: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Available
                          <select
                            value={optionForm.isAvailable ? "yes" : "no"}
                            onChange={(event) =>
                              setOptionForm((current) => ({
                                ...current,
                                isAvailable: event.target.value === "yes",
                              }))
                            }
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </label>
                      </div>
                      <div className="menu-builder-actions">
                        <button type="submit" className="primary" disabled={saving}>
                          {saving ? <LoaderCircle className="spin" /> : <Save />}
                          Save option
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setOptionForm({ ...emptyOption(), groupId: selectedGroup.id })}
                        >
                          <Plus /> New option
                        </button>
                      </div>
                    </form>

                    <div className="menu-item-list">
                      {selectedGroup.options.map((option) => (
                        <article key={option.id} className="menu-record-card">
                          <div>
                            <b>{option.name}</b>
                            <small>
                              {option.priceAdjustmentRwf
                                ? formatRwf(option.priceAdjustmentRwf)
                                : "Included"}
                            </small>
                          </div>
                          <div className="menu-record-actions">
                            <button
                              type="button"
                              onClick={() =>
                                setOptionForm({
                                  id: option.id,
                                  groupId: selectedGroup.id,
                                  name: option.name,
                                  priceAdjustmentRwf: String(option.priceAdjustmentRwf),
                                  isAvailable: option.isAvailable,
                                  sortOrder: String(option.sortOrder),
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                mutate(
                                  { entity: "choice-option", action: "delete", id: option.id },
                                  "Option deleted.",
                                )
                              }
                            >
                              <Trash2 /> Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <section style={{ marginTop: "18px" }}>
              <h3>Add-on groups for this store</h3>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (isBlank(addOnForm.name)) {
                    setError("Group name is required.");
                    return;
                  }
                  mutate(
                    {
                      entity: "addon",
                      action: "save",
                      id: addOnForm.id || undefined,
                      storeId: selectedStore.id,
                      name: addOnForm.name,
                      category: addOnForm.category,
                      description: addOnForm.description,
                      priceRwf: Number(addOnForm.priceRwf),
                      selectionMode: addOnForm.selectionMode,
                      required: addOnForm.required,
                      minSelections: Number(addOnForm.minSelections),
                      maxSelections: Number(addOnForm.maxSelections),
                      sortOrder: Number(addOnForm.sortOrder),
                      isAvailable: addOnForm.isAvailable,
                    },
                    "Add-on group saved.",
                  );
                }}
              >
                <div className="menu-builder-grid">
                  <label>
                    Group name
                    <input
                      value={addOnForm.name}
                      onChange={(event) =>
                        setAddOnForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Choice of Cutlery / Crockery"
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={addOnForm.category}
                      onChange={(event) =>
                        setAddOnForm((current) => ({ ...current, category: event.target.value }))
                      }
                      placeholder="Breakfast extras"
                    />
                  </label>
                  <label>
                    Description / instruction
                    <input
                      value={addOnForm.description}
                      onChange={(event) =>
                        setAddOnForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Choose up to 2 items"
                    />
                  </label>
                  <label>
                    Extra price
                    <input
                      type="number"
                      value={addOnForm.priceRwf}
                      onChange={(event) =>
                        setAddOnForm((current) => ({ ...current, priceRwf: event.target.value }))
                      }
                      placeholder="0"
                    />
                  </label>
                  <label>
                    Selection type
                    <select
                      value={addOnForm.selectionMode}
                      onChange={(event) =>
                        setAddOnForm((current) => ({
                          ...current,
                          selectionMode: event.target.value === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
                        }))
                      }
                    >
                      <option value="SINGLE">Single option</option>
                      <option value="MULTIPLE">Multiple options</option>
                    </select>
                  </label>
                  <label>
                    Required
                    <select
                      value={addOnForm.required ? "yes" : "no"}
                      onChange={(event) =>
                        setAddOnForm((current) => ({
                          ...current,
                          required: event.target.value === "yes",
                        }))
                      }
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                  <label>
                    Minimum selections
                    <input
                      type="number"
                      value={addOnForm.minSelections}
                      onChange={(event) =>
                        setAddOnForm((current) => ({ ...current, minSelections: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Maximum selections
                    <input
                      type="number"
                      value={addOnForm.maxSelections}
                      onChange={(event) =>
                        setAddOnForm((current) => ({ ...current, maxSelections: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Display order
                    <input
                      type="number"
                      value={addOnForm.sortOrder}
                      onChange={(event) =>
                        setAddOnForm((current) => ({ ...current, sortOrder: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Active
                    <select
                      value={addOnForm.isAvailable ? "yes" : "no"}
                      onChange={(event) =>
                        setAddOnForm((current) => ({
                          ...current,
                          isAvailable: event.target.value === "yes",
                        }))
                      }
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                </div>
                <div className="menu-builder-actions">
                  <button type="submit" className="primary" disabled={saving}>
                    {saving ? <LoaderCircle className="spin" /> : <Save />}
                    Save group
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setAddOnForm({
                        ...emptyAddOn(),
                        storeId: selectedStore.id,
                      })
                    }
                  >
                    <Plus /> New group
                  </button>
                </div>
              </form>

              <div className="menu-item-list">
                {groupedAddOns.map((group) => (
                  <section key={group.category} style={{ display: "grid", gap: "10px" }}>
                    <div className="panel-subhead" style={{ marginTop: "8px" }}>
                      <h4>{group.category}</h4>
                      <small>{group.items.length} item{group.items.length === 1 ? "" : "s"}</small>
                    </div>
                    {group.items.map((addOn) => {
                      const linked = addOnLinks.some((linkedAddOn) => linkedAddOn.id === addOn.id);
                      return (
                        <article key={addOn.id} className="menu-record-card">
                          <div>
                            <b>{addOn.name}</b>
                            <small>
                              {addOn.required ? "Required" : "Optional"} · {addOn.selectionMode === "MULTIPLE" ? "Multiple options" : "Single option"} · {addOn.options.length} option{addOn.options.length === 1 ? "" : "s"}
                            </small>
                          </div>
                          <div className="menu-record-actions">
                            <button
                              type="button"
                              onClick={() =>
                                {
                                  setSelectedAddOnId(addOn.id);
                                  setSelectedAddOnOptionId(addOn.options[0]?.id ?? "");
                                  setAddOnOptionForm({
                                    ...emptyAddOnOption(),
                                    addOnId: addOn.id,
                                  });
                                  setAddOnForm({
                                    id: addOn.id,
                                    storeId: selectedStore.id,
                                    name: addOn.name,
                                    category: addOn.category ?? "",
                                    description: addOn.description ?? "",
                                    priceRwf: String(addOn.priceRwf),
                                    selectionMode: addOn.selectionMode ?? "SINGLE",
                                    required: addOn.required ?? false,
                                    minSelections: String(addOn.minSelections ?? 0),
                                    maxSelections: String(addOn.maxSelections ?? 1),
                                    sortOrder: String(addOn.sortOrder ?? 0),
                                    isAvailable: addOn.isAvailable,
                                  });
                                }
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setBulkAddOnId(addOn.id)}
                            >
                              Use in bulk
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                mutate(
                                  { entity: "addon", action: "delete", id: addOn.id },
                                  "Add-on deleted.",
                                )
                              }
                            >
                              <Trash2 /> Delete
                            </button>
                            {selectedProduct && (
                              <button
                                type="button"
                          onClick={() =>
                                  mutate(
                          {
                            entity: "addon-link",
                            action: linked ? "delete" : "save",
                            productId: selectedProduct.id,
                            addOnId: addOn.id,
                            groupName:
                              productAddOnGroupName.trim() ||
                              selectedProductAddOnGroups[0]?.groupName ||
                              "AddOns",
                            selectionMode:
                              productAddOnGroupMode ||
                              selectedProductAddOnGroups[0]?.selectionMode ||
                              "SINGLE",
                            required: productAddOnRequired,
                            minSelections: Number(productAddOnMinSelections),
                            maxSelections: Number(productAddOnMaxSelections),
                            hiddenOptionIds: productAddOnHiddenOptionIds,
                            optionPriceOverrides: Object.fromEntries(
                              Object.entries(productAddOnOptionPriceOverrides)
                                .filter(([, value]) => value !== "")
                                .map(([key, value]) => [key, Number(value)]),
                            ),
                          },
                          linked ? "Group unlinked." : "Group linked.",
                        )
                              }
                            >
                              {linked ? "Unlink from product" : "Link to product"}
                            </button>
                          )}
                          </div>
                        </article>
                      );
                    })}
                  </section>
                ))}
              </div>

              {selectedProduct && (
                <div className="admin-management-card" style={{ marginTop: "18px" }}>
                  <div className="panel-head">
                    <span>Linked</span>
                    <div>
                      <span className="catalog-kicker">PRODUCT ADD-ON GROUPS</span>
                      <h2>Linked groups on {selectedProduct.name}</h2>
                      <p>
                        Link reusable add-on groups to this product, then override the group name,
                        required state, selection limits, hidden options, or option prices when needed.
                      </p>
                    </div>
                  </div>

                  <div className="menu-builder-grid" style={{ marginBottom: "14px" }}>
                    <label>
                      Override group name
                      <input
                        value={productAddOnGroupName}
                        onChange={(event) => setProductAddOnGroupName(event.target.value)}
                        placeholder="Choice of drinks"
                      />
                    </label>
                    <label>
                      Selection type
                      <select
                        value={productAddOnGroupMode}
                        onChange={(event) =>
                          setProductAddOnGroupMode(
                            event.target.value === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
                          )
                        }
                      >
                        <option value="SINGLE">Single option</option>
                        <option value="MULTIPLE">Multiple options</option>
                      </select>
                    </label>
                    <label>
                      Required
                      <select
                        value={productAddOnRequired ? "yes" : "no"}
                        onChange={(event) => setProductAddOnRequired(event.target.value === "yes")}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </label>
                    <label>
                      Minimum selections
                      <input
                        type="number"
                        value={productAddOnMinSelections}
                        onChange={(event) => setProductAddOnMinSelections(event.target.value)}
                      />
                    </label>
                    <label>
                      Maximum selections
                      <input
                        type="number"
                        value={productAddOnMaxSelections}
                        onChange={(event) => setProductAddOnMaxSelections(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="menu-builder-actions" style={{ marginBottom: "12px" }}>
                    <button
                      type="button"
                      className="primary"
                      disabled={saving || !selectedProductLinkedAddOn}
                      onClick={() =>
                        selectedProductLinkedAddOn &&
                        mutate(
                          {
                            entity: "addon-link",
                            action: "save",
                            productId: selectedProduct.id,
                            addOnId: selectedProductLinkedAddOn.id,
                            groupName: productAddOnGroupName.trim() || selectedProductLinkedAddOn.groupName || selectedProductLinkedAddOn.name,
                            selectionMode: productAddOnGroupMode,
                            required: productAddOnRequired,
                            minSelections: Number(productAddOnMinSelections),
                            maxSelections: Number(productAddOnMaxSelections),
                            hiddenOptionIds: productAddOnHiddenOptionIds,
                            optionPriceOverrides: Object.fromEntries(
                              Object.entries(productAddOnOptionPriceOverrides)
                                .filter(([, value]) => value !== "")
                                .map(([key, value]) => [key, Number(value)]),
                            ),
                          },
                          "Product add-on overrides saved.",
                        )
                      }
                    >
                      <Save /> Save overrides
                    </button>
                    <small style={{ color: "var(--muted)", alignSelf: "center" }}>
                      These settings apply only to this product.
                    </small>
                  </div>

                  {selectedProductLinkedAddOn?.options?.length ? (
                    <div className="menu-builder-card" style={{ padding: "14px", marginBottom: "14px" }}>
                      <div className="panel-subhead" style={{ marginBottom: "10px" }}>
                        <h4>Hide options or change their price for this product</h4>
                        <small>{selectedProductLinkedAddOn.options.length} linked option{selectedProductLinkedAddOn.options.length === 1 ? "" : "s"}</small>
                      </div>
                      <div style={{ display: "grid", gap: "10px" }}>
                        {selectedProductLinkedAddOn.options.map((option) => {
                          const hidden = productAddOnHiddenOptionIds.includes(option.id);
                          return (
                            <div
                              key={option.id}
                              className="menu-record-card"
                              style={{ alignItems: "center", justifyContent: "space-between" }}
                            >
                              <label style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={hidden}
                                  onChange={(event) =>
                                    setProductAddOnHiddenOptionIds((current) =>
                                      event.target.checked
                                        ? Array.from(new Set([...current, option.id]))
                                        : current.filter((id) => id !== option.id),
                                    )
                                  }
                                />
                                <span>
                                  <b>{option.name}</b>
                                  <small style={{ display: "block", color: "var(--muted)" }}>
                                    Default {formatRwf(option.priceAdjustmentRwf)}
                                  </small>
                                </span>
                              </label>
                              <label style={{ minWidth: "140px" }}>
                                Override price
                                <input
                                  type="number"
                                  value={productAddOnOptionPriceOverrides[option.id] ?? ""}
                                  onChange={(event) =>
                                    setProductAddOnOptionPriceOverrides((current) => ({
                                      ...current,
                                      [option.id]: event.target.value,
                                    }))
                                  }
                                  placeholder={String(option.priceAdjustmentRwf)}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {selectedProductAddOnGroups.length ? (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {selectedProductAddOnGroups.map((group) => (
                        <article
                          key={group.groupName}
                          className="menu-record-card"
                          style={{
                            cursor: "pointer",
                            borderColor:
                              productAddOnGroupName.trim() === group.groupName ? "var(--green)" : undefined,
                          }}
                          onClick={() => {
                            setProductAddOnGroupName(group.groupName);
                            setProductAddOnGroupMode(group.selectionMode);
                            setProductAddOnRequired(group.required);
                            setProductAddOnMinSelections(String(group.minSelections));
                            setProductAddOnMaxSelections(String(group.maxSelections));
                            setProductAddOnHiddenOptionIds(
                              Array.isArray(group.hiddenOptionIds) ? group.hiddenOptionIds : [],
                            );
                            setProductAddOnOptionPriceOverrides(
                              group.optionPriceOverrides &&
                                typeof group.optionPriceOverrides === "object" &&
                                !Array.isArray(group.optionPriceOverrides)
                                ? Object.fromEntries(
                                    Object.entries(group.optionPriceOverrides as Record<string, unknown>).map(
                                      ([key, value]) => [key, String(value)],
                                    ),
                                  )
                                : {},
                            );
                            setSelectedProductAddOnId(group.items[0]?.id ?? "");
                          }}
                        >
                          <div>
                            <b>{group.groupName}</b>
                            <small>
                              {group.selectionMode === "MULTIPLE" ? "Multiple options" : "Single option"} · {group.items.length} item{group.items.length === 1 ? "" : "s"}
                            </small>
                          </div>
                          <small style={{ color: "var(--muted)" }}>Click to edit these overrides</small>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--muted)", margin: 0 }}>No add-on groups linked yet.</p>
                  )}
                </div>
              )}

              {selectedAddOn && (
                <div className="admin-management-card" style={{ marginTop: "18px" }}>
                  <div className="panel-head">
                    <span>Opt</span>
                    <div>
                      <span className="catalog-kicker">ADD-ON OPTIONS</span>
                      <h2>Set options for {selectedAddOn.name}</h2>
                      <p>Use this when an add-on should let the customer pick one choice.</p>
                    </div>
                  </div>

                  <form
                    className="menu-builder-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      mutate(
                        {
                          entity: "addon-option",
                          action: "save",
                          id: addOnOptionForm.id || undefined,
                          addOnId: selectedAddOn.id,
                          name: addOnOptionForm.name,
                          priceAdjustmentRwf: Number(addOnOptionForm.priceAdjustmentRwf),
                          isAvailable: addOnOptionForm.isAvailable,
                        },
                        addOnOptionForm.id ? "Add-on option updated." : "Add-on option saved.",
                      );
                    }}
                  >
                    <div className="menu-builder-grid">
                      <label>
                        Option name
                        <input
                          value={addOnOptionForm.name}
                          onChange={(event) =>
                            setAddOnOptionForm((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="e.g. Small, Large, Extra shot"
                        />
                      </label>
                      <label>
                        Price adjustment
                        <input
                          type="number"
                          value={addOnOptionForm.priceAdjustmentRwf}
                          onChange={(event) =>
                            setAddOnOptionForm((current) => ({
                              ...current,
                              priceAdjustmentRwf: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Available
                        <select
                          value={addOnOptionForm.isAvailable ? "yes" : "no"}
                          onChange={(event) =>
                            setAddOnOptionForm((current) => ({
                              ...current,
                              isAvailable: event.target.value === "yes",
                            }))
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </label>
                    </div>
                    <div className="menu-builder-actions">
                      <button type="submit" className="primary" disabled={saving}>
                        {saving ? <LoaderCircle className="spin" /> : <Save />}
                        Save option
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          setAddOnOptionForm({
                            ...emptyAddOnOption(),
                            addOnId: selectedAddOn.id,
                          })
                        }
                      >
                        <Plus /> New option
                      </button>
                    </div>
                  </form>

                  <div className="menu-item-list">
                    {selectedAddOn.options.length ? (
                      selectedAddOn.options.map((option) => (
                        <article key={option.id} className="menu-record-card">
                          <div>
                            <b>{option.name}</b>
                            <small>
                              {option.isAvailable ? "Available" : "Unavailable"} · {option.priceAdjustmentRwf ? formatRwf(option.priceAdjustmentRwf) : "Included"}
                            </small>
                          </div>
                          <div className="menu-record-actions">
                            <button
                              type="button"
                              onClick={() =>
                                setAddOnOptionForm({
                                  id: option.id,
                                  addOnId: selectedAddOn.id,
                                  name: option.name,
                                  priceAdjustmentRwf: String(option.priceAdjustmentRwf),
                                  isAvailable: option.isAvailable,
                                  sortOrder: String(option.sortOrder),
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                mutate(
                                  {
                                    entity: "addon-option",
                                    action: "delete",
                                    id: option.id,
                                    addOnId: selectedAddOn.id,
                                  },
                                  "Add-on option deleted.",
                                )
                              }
                            >
                              <Trash2 /> Delete
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p style={{ color: "var(--muted)", margin: 0 }}>
                        No options yet. Add one to make this add-on selectable.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="admin-management-card" style={{ marginTop: "18px" }}>
                <div className="panel-head">
                  <span>Bulk</span>
                  <div>
                    <span className="catalog-kicker">BULK LINK ADD-ONS</span>
                    <h2>Use one add-on on many products</h2>
                    <p>Pick an add-on once, then apply it to several products in this store.</p>
                  </div>
                </div>

                <div className="menu-builder-grid">
                  <label>
                    Search products
                    <input
                      value={bulkAddOnSearch}
                      onChange={(event) => setBulkAddOnSearch(event.target.value)}
                      placeholder="Search by name or category"
                      />
                  </label>
                  <label>
                    Add-on
                    <select value={bulkAddOnId} onChange={(event) => setBulkAddOnId(event.target.value)}>
                      {selectedStore.restaurantAddOns.length === 0 ? (
                        <option value="">No add-ons available</option>
                      ) : (
                        selectedStore.restaurantAddOns.map((addOn) => (
                          <option key={addOn.id} value={addOn.id}>
                            {addOn.name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label>
                    Group name
                    <input
                      value={bulkAddOnGroupName}
                      onChange={(event) => setBulkAddOnGroupName(event.target.value)}
                      placeholder="Choice of drinks"
                    />
                  </label>
                  <label>
                    Group mode
                    <select
                      value={bulkAddOnGroupMode}
                      onChange={(event) =>
                        setBulkAddOnGroupMode(
                          event.target.value === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
                        )
                      }
                    >
                      <option value="SINGLE">Single option</option>
                      <option value="MULTIPLE">Multiple options</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setBulkAddOnTargetProductIds(
                        filteredBulkAddOnProducts.map((product) => product.id),
                      )
                    }
                    disabled={!filteredBulkAddOnProducts.length}
                  >
                    Select all products
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setBulkAddOnTargetProductIds([])}
                    disabled={!bulkAddOnTargetProductIds.length}
                  >
                    Clear selection
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {filteredBulkAddOnProducts.map((product) => {
                    const checked = bulkAddOnTargetProductIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() =>
                          setBulkAddOnTargetProductIds((current) =>
                            current.includes(product.id)
                              ? current.filter((id) => id !== product.id)
                              : [...current, product.id],
                          )
                        }
                        style={{
                          border: `1px solid ${checked ? "var(--green)" : "var(--line)"}`,
                          borderRadius: "16px",
                          padding: "14px 16px",
                          textAlign: "left",
                          background: checked ? "#eef4eb" : "#fff",
                        }}
                      >
                        <b style={{ display: "block" }}>{product.name}</b>
                        <small style={{ color: "var(--muted)" }}>{product.category.name}</small>
                      </button>
                    );
                  })}
                  {!filteredBulkAddOnProducts.length && (
                    <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
                      No products match your search.
                    </p>
                  )}
                </div>

                <div className="menu-builder-actions" style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    className="primary"
                    disabled={saving || !bulkAddOnId || !bulkAddOnTargetProductIds.length}
                    onClick={() =>
                      mutate(
                        {
                          entity: "addon-link",
                          action: "save",
                          addOnId: bulkAddOnId,
                          productIds: bulkAddOnTargetProductIds,
                          groupName: bulkAddOnGroupName.trim() || undefined,
                          selectionMode: bulkAddOnGroupMode,
                        },
                        "Add-on linked to products.",
                      )
                    }
                  >
                    <Plus /> Link to selected products
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={saving || !bulkAddOnId || !bulkAddOnTargetProductIds.length}
                    onClick={() =>
                      mutate(
                        {
                          entity: "addon-link",
                          action: "delete",
                          addOnId: bulkAddOnId,
                          productIds: bulkAddOnTargetProductIds,
                          groupName: bulkAddOnGroupName.trim() || undefined,
                          selectionMode: bulkAddOnGroupMode,
                        },
                        "Add-on unlinked from products.",
                      )
                    }
                  >
                    <Trash2 /> Unlink selected
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}
    </section>
  );
}




