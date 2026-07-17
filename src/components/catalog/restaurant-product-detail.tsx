"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Share2,
  Minus,
  Plus,
  ShoppingBag,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { formatRwf } from "@/lib/catalog";
import {
  buildRestaurantConfigurationKey,
  choiceInstruction,
  choiceMode,
  computeRestaurantUnitPrice,
  validateRestaurantConfiguration,
  type RestaurantAddOn,
  type RestaurantMenuProduct,
  type RestaurantConfiguration,
} from "@/lib/restaurant-menu";
import type { CartProduct } from "@/lib/cart-types";
import { productImage } from "@/lib/product-images";

type SelectionMap = Record<string, string[]>;
type AddOnGroup = {
  category: string;
  items: RestaurantAddOn[];
  selectionMode: "SINGLE" | "MULTIPLE";
  required: boolean;
  minSelections: number;
  maxSelections: number;
};

export function RestaurantProductDetail({ product }: { product: RestaurantMenuProduct }) {
  const router = useRouter();
  const cart = useCart();
  const initialVariant =
    product.variants.find((variant) => variant.isDefault && variant.isAvailable) ??
    product.variants.find((variant) => variant.isAvailable) ??
    product.variants[0] ??
    null;
  const [quantity, setQuantity] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    product.choiceGroups.map((group) => group.id),
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariant?.id ?? null,
  );
  const [selectedChoices, setSelectedChoices] = useState<SelectionMap>(() => {
    const base: SelectionMap = {};
    for (const group of product.choiceGroups) base[group.id] = [];
    return base;
  });
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedAddOnOptionIds, setSelectedAddOnOptionIds] = useState<Record<string, string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const groupedAddOns = useMemo<AddOnGroup[]>(() => {
    const addOns = product.addOns.filter((addOn) => addOn.isAvailable);
    if (!addOns.length) return [];
    const hasSharedGrouping = addOns.some((addOn) => {
      const groupName = addOn.groupName?.trim();
      if (!groupName) return false;
      return groupName.toLowerCase() !== addOn.name.trim().toLowerCase();
    });
    if (!hasSharedGrouping && addOns.length > 1) {
      return [
        {
          category: "Add-ons",
          items: addOns,
          selectionMode:
            addOns.some((item) => item.groupSelectionMode === "MULTIPLE")
              ? "MULTIPLE"
              : "SINGLE",
          required: addOns.some((item) => item.required),
          minSelections: Math.max(0, ...addOns.map((item) => item.minSelections ?? 0)),
          maxSelections: Math.max(1, ...addOns.map((item) => item.maxSelections ?? 1)),
        },
      ];
    }
    const grouped = new Map<string, typeof addOns>();
    for (const addOn of addOns) {
      const groupName = addOn.groupName?.trim() || addOn.name;
      const bucket = grouped.get(groupName) ?? [];
      bucket.push(addOn);
      grouped.set(groupName, bucket);
    }
    return [...grouped.entries()]
      .map(([category, items]) => {
        const first = items[0];
        return {
          category,
          items,
          selectionMode:
            items.find((item) => item.groupSelectionMode)?.groupSelectionMode ?? "SINGLE",
          required: first?.required ?? false,
          minSelections: first?.minSelections ?? 0,
          maxSelections: first?.maxSelections ?? 1,
        };
      })
  }, [product.addOns]);

  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      initialVariant,
    [initialVariant, product.variants, selectedVariantId],
  );

  const configuration = useMemo<RestaurantConfiguration>(() => {
    const selections = product.choiceGroups
      .map((group) => {
        const optionIds = selectedChoices[group.id] ?? [];
        if (!optionIds.length) return null;
        const options = group.options.filter((option) =>
          optionIds.includes(option.id),
        );
        return {
          groupId: group.id,
          groupName: group.name,
          optionIds,
          optionNames: options.map((option) => option.name),
          selectionMode: choiceMode(group),
          priceAdjustmentRwf: options.reduce(
            (sum, option) => sum + option.priceAdjustmentRwf,
            0,
          ),
        };
      })
      .filter(Boolean) as RestaurantConfiguration["selections"];

    return {
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            priceRwf: selectedVariant.priceRwf,
          }
        : null,
      selections,
              addOns: product.addOns
        .flatMap((addOn) => {
          const addOnOptions = addOn.options ?? [];
          if (addOnOptions.length) {
            const optionIds = selectedAddOnOptionIds[addOn.id] ?? [];
            if (!optionIds.length) return [];
            const options = optionIds
              .map((optionId) => addOnOptions.find((candidate) => candidate.id === optionId))
              .filter((option): option is (typeof addOnOptions)[number] => Boolean(option));
            if (!options.length) return [];
            return [
              {
                id: addOn.id,
                name: addOn.name,
                priceRwf: addOn.priceRwf,
                quantity: 1,
                groupName: addOn.groupName ?? addOn.name,
                groupSelectionMode: addOn.groupSelectionMode ?? "SINGLE",
                selectionMode: addOn.selectionMode ?? "SINGLE",
                optionIds: options.map((option) => option.id),
                optionNames: options.map((option) => option.name),
                optionPriceAdjustmentRwf: options.reduce(
                  (sum, option) => sum + option.priceAdjustmentRwf,
                  0,
                ),
              },
            ];
          }
          return selectedAddOnIds.includes(addOn.id)
            ? [
                {
                id: addOn.id,
                name: addOn.name,
                priceRwf: addOn.priceRwf,
                quantity: 1,
                groupName: addOn.groupName ?? addOn.name,
                groupSelectionMode: addOn.groupSelectionMode ?? "SINGLE",
                selectionMode: addOn.selectionMode ?? "SINGLE",
              },
            ]
            : [];
        }),
      specialInstructions: specialInstructions.trim() || undefined,
    };
  }, [product.addOns, product.choiceGroups, selectedAddOnIds, selectedAddOnOptionIds, selectedChoices, selectedVariant, specialInstructions]);

  const unitPriceRwf = computeRestaurantUnitPrice(product, configuration) + product.containerChargePerUnitRwf;
  const totalRwf = unitPriceRwf * quantity + product.containerChargeFlatRwf;
  const errors = validateRestaurantConfiguration(product, configuration);
  const lineKey = buildRestaurantConfigurationKey(product.id, configuration);

  function toggleChoice(groupId: string, optionId: string, maxChoices: number) {
    setError("");
    setSelectedChoices((current) => {
      const existing = current[groupId] ?? [];
      const isSelected = existing.includes(optionId);
      let next: string[];
      if (maxChoices === 1) {
        next = isSelected ? [] : [optionId];
      } else if (isSelected) {
        next = existing.filter((item) => item !== optionId);
      } else if (existing.length >= maxChoices) {
        next = existing;
      } else {
        next = [...existing, optionId];
      }
      return { ...current, [groupId]: next };
    });
  }

  function toggleAddOn(addOnId: string, groupName?: string | null, mode: "SINGLE" | "MULTIPLE" = "SINGLE") {
    setError("");
    setSelectedAddOnIds((current) =>
      mode === "SINGLE"
        ? current.includes(addOnId)
          ? current.filter((item) => item !== addOnId)
          : [
              ...current.filter((item) => {
                const existing = product.addOns.find((candidate) => candidate.id === item);
                const existingGroup = existing?.groupName?.trim() || existing?.name;
                return existingGroup !== (groupName?.trim() || "");
              }),
              addOnId,
            ]
        : current.includes(addOnId)
          ? current.filter((item) => item !== addOnId)
          : [...current, addOnId],
    );
  }

  function chooseAddOnOption(
    addOnId: string,
    optionId: string,
    mode: "SINGLE" | "MULTIPLE",
    maxSelections = Number.POSITIVE_INFINITY,
  ) {
    setError("");
    setSelectedAddOnOptionIds((current) => {
      const existing = current[addOnId] ?? [];
      if (mode === "SINGLE") {
        return {
          ...current,
          [addOnId]: existing[0] === optionId ? [] : [optionId],
        };
      }
      const isSelected = existing.includes(optionId);
      if (!isSelected && existing.length >= maxSelections) {
        setError(`You can choose up to ${maxSelections} options for this group.`);
        return current;
      }
      return {
        ...current,
        [addOnId]: isSelected
          ? existing.filter((item) => item !== optionId)
          : [...existing, optionId],
      };
    });
  }

  async function addToCart() {
    setError("");
    const configErrors = validateRestaurantConfiguration(product, configuration);
    if (configErrors.length) {
      setError(configErrors[0]);
      return;
    }
    const productToAdd: CartProduct = {
      id: product.id,
      lineKey,
      storeId: product.store.id,
      storeName: product.store.name,
      catalogEngine: "RESTAURANT",
      ageConfirmationRequired: product.store.ageConfirmationRequired ?? false,
      name: product.name,
      basePriceRwf: product.basePriceRwf,
      priceRwf: unitPriceRwf,
      containerChargePerUnitRwf: product.containerChargePerUnitRwf,
      containerChargeFlatRwf: product.containerChargeFlatRwf,
      imageUrl: productImage(product.imageUrl, {
        catalogEngine: "RESTAURANT",
        categoryName: product.category.name,
        productName: product.name,
      }),
      detailHref: `/stores/${product.store.slug}/products/${product.id}`,
      variant: configuration.variant ?? undefined,
      selections: configuration.selections,
      addOns: configuration.addOns,
      specialInstructions: configuration.specialInstructions,
    };

    const result = cart.addItem(productToAdd);
    if (!result.ok) {
      setError(`Your cart already contains items from ${result.conflictStoreName}.`);
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
    router.push("/cart");
  }

  async function shareProduct() {
    const url = window.location.href;
    const text = `${product.name} at ${product.store.name}`;
    if (navigator.share) {
      await navigator.share({ title: text, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setError("Link copied to clipboard.");
  }

  return (
    <main className="menu-engine-page">
      <section className="menu-engine-hero">
        <div className="menu-engine-copy">
          <div className="menu-engine-topbar">
            <button className="menu-engine-back" onClick={() => router.back()}>
              <ArrowLeft /> Back
            </button>
            <button className="menu-engine-share" onClick={shareProduct}>
              <Share2 /> Share
            </button>
          </div>
          <div className="menu-engine-product-overview">
            <div className="menu-engine-product-photo">
              <Image
                src={productImage(product.imageUrl, {
                  catalogEngine: "RESTAURANT",
                  categoryName: product.category.name,
                  productName: product.name,
                })}
                alt={product.name}
                fill
                sizes="(max-width: 720px) 100vw, 250px"
                unoptimized
              />
            </div>
            <div className="menu-engine-heading-copy">
              <span className="catalog-kicker">RESTAURANT MENU</span>
              <h1>{product.name}</h1>
              <div className="menu-engine-title-meta">
                <span className="menu-engine-store">{product.store.name}</span>
                <span className={`menu-engine-live ${product.isAvailable ? "live" : "off"}`}>
                  {product.isAvailable ? "Available now" : "Currently unavailable"}
                </span>
              </div>
            </div>
          </div>

          <section className="menu-engine-intro">
            <div className="menu-engine-intro-head">
              <h2>About this item</h2>
            </div>
            <p className="menu-engine-description">
              {product.description || "Customize this item before adding it to your cart."}
            </p>
          </section>

          <div className="menu-engine-meta">
            <article>
              <small>Base price</small>
              <b>{formatRwf(product.basePriceRwf)}</b>
            </article>
            {(product.containerChargePerUnitRwf > 0 || product.containerChargeFlatRwf > 0) && (
              <article>
                <small>Container charge</small>
                <b>
                  {[
                    product.containerChargePerUnitRwf > 0 ? `${formatRwf(product.containerChargePerUnitRwf)} each` : "",
                    product.containerChargeFlatRwf > 0 ? `${formatRwf(product.containerChargeFlatRwf)} once` : "",
                  ].filter(Boolean).join(" + ")}
                </b>
              </article>
            )}
            <article>
              <small>Category</small>
              <b>{product.category.name}</b>
            </article>
          </div>

          {!!product.variants.length && (
            <section className="menu-engine-section">
              <div className="menu-engine-section-head">
                <h2>Choose one option</h2>
                <span className="menu-engine-chip">Select one</span>
              </div>
              <div className="menu-engine-options">
                {product.variants
                  .filter((variant) => variant.isAvailable)
                  .map((variant) => {
                    const active = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        className={`menu-engine-option ${active ? "active" : ""}`}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setError("");
                        }}
                      >
                        <span>
                          <b>{variant.name}</b>
                          <small>
                            {variant.priceRwf === product.basePriceRwf
                              ? "Standard price"
                              : variant.priceRwf > product.basePriceRwf
                                ? `+ ${formatRwf(variant.priceRwf - product.basePriceRwf)}`
                                : `- ${formatRwf(product.basePriceRwf - variant.priceRwf)}`}
                          </small>
                        </span>
                        {active && <Check />}
                      </button>
                    );
                  })}
              </div>
            </section>
          )}

          {product.choiceGroups.map((group) => {
            const selected = selectedChoices[group.id] ?? [];
            const single = group.maxChoices === 1;
            const open = expandedGroups.includes(group.id);
            return (
              <details
                key={group.id}
                open={open}
                className="menu-engine-section"
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setExpandedGroups((current) =>
                    isOpen
                      ? Array.from(new Set([...current, group.id]))
                      : current.filter((item) => item !== group.id),
                  );
                }}
              >
                <summary className="menu-engine-group-summary">
                  <span className="menu-engine-group-copy">
                    <b>{group.name}</b>
                    <small>{choiceInstruction(group)}</small>
                  </span>
                  <span className="menu-engine-summary-right">
                    {group.required && <em>Required</em>}
                    {open ? <ChevronUp /> : <ChevronDown />}
                  </span>
                </summary>

                <div className="menu-engine-options menu-engine-options-grid">
                  {group.options
                    .filter((option) => option.isAvailable)
                    .map((option) => {
                      const active = selected.includes(option.id);
                      const maxed =
                        !active &&
                        !single &&
                        selected.length >= group.maxChoices;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`menu-engine-choice ${active ? "active" : ""}`}
                          disabled={maxed}
                          onClick={() => toggleChoice(group.id, option.id, group.maxChoices)}
                        >
                          <span className={single ? "radio" : "checkbox"}>
                            <i />
                          </span>
                          <span className="menu-engine-choice-copy">
                            <b>{option.name}</b>
                            <small>
                              {option.priceAdjustmentRwf
                                ? option.priceAdjustmentRwf > 0
                                  ? `+ ${formatRwf(option.priceAdjustmentRwf)}`
                                  : `- ${formatRwf(Math.abs(option.priceAdjustmentRwf))}`
                                : "Included"}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                </div>
              </details>
            );
          })}

          {!!groupedAddOns.length && (
            <section className="menu-engine-section">
              <div className="menu-engine-section-head">
                <h2>Add-ons</h2>
                <span className="menu-engine-chip">Optional</span>
              </div>
              <div className="menu-engine-addons">
                {groupedAddOns.map((group) => (
                  <section
                    key={`${group.category}-${group.items[0]?.id ?? group.items.length}`}
                    className="menu-engine-addon-category"
                  >
                    <div className="menu-engine-section-head" style={{ marginBottom: "10px" }}>
                      <h3 style={{ margin: 0 }}>Choose your add-ons</h3>
                      <small style={{ color: "var(--muted)", fontWeight: 600 }}>
                        {group.required
                          ? group.selectionMode === "SINGLE"
                            ? "Required · choose one only"
                            : `Required · choose at least ${Math.max(1, group.minSelections)}`
                          : group.selectionMode === "SINGLE"
                            ? "Choose one only"
                            : "Multiple choice"}
                      </small>
                    </div>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {group.items.map((addOn) => {
                        const isRepeatedGroupName =
                          group.items.length === 1 &&
                          addOn.name.trim().toLowerCase() === group.category.trim().toLowerCase();
                        if (addOn.options?.length) {
                          const selectedOptionIds = selectedAddOnOptionIds[addOn.id] ?? [];
                          const single = group.selectionMode === "SINGLE";
                          return (
                            <div key={addOn.id} className="menu-engine-addon-group">
                              {!isRepeatedGroupName && (
                                <div className="menu-engine-section-head" style={{ marginBottom: "12px" }}>
                                  <h4 style={{ margin: 0 }}>{addOn.name}</h4>
                                  <span className="menu-engine-chip">{formatRwf(addOn.priceRwf)}</span>
                                </div>
                              )}
                              <div className="menu-engine-options menu-engine-options-grid">
                                {addOn.options
                                  .filter((option) => option.isAvailable)
                                  .map((option) => {
                                    const active = selectedOptionIds.includes(option.id);
                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        className={`menu-engine-choice ${active ? "active" : ""}`}
                                        onClick={() =>
                                          chooseAddOnOption(
                                            addOn.id,
                                            option.id,
                                            single ? "SINGLE" : "MULTIPLE",
                                            group.maxSelections,
                                          )
                                        }
                                      >
                                        <span className={single ? "radio" : "checkbox"}>
                                          <i />
                                        </span>
                                        <span className="menu-engine-choice-copy">
                                          <b>{option.name}</b>
                                          <small>
                                            {addOn.priceRwf + option.priceAdjustmentRwf > 0
                                              ? `${formatRwf(addOn.priceRwf + option.priceAdjustmentRwf)}`
                                              : "Included"}
                                          </small>
                                        </span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        }
                        const active = selectedAddOnIds.includes(addOn.id);
                        return (
                          <button
                            key={addOn.id}
                            type="button"
                            className={`menu-engine-choice ${active ? "active" : ""}`}
                            aria-label={`${group.category} ${addOn.name}`}
                            onClick={() => toggleAddOn(addOn.id, group.category, group.selectionMode)}
                          >
                            <span className={group.selectionMode === "SINGLE" ? "radio" : "checkbox"}>
                              <i />
                            </span>
                            {!isRepeatedGroupName ? (
                              <span className="menu-engine-choice-copy">
                                <b>{addOn.name}</b>
                                <small>{formatRwf(addOn.priceRwf)}</small>
                              </span>
                            ) : (
                              <span className="menu-engine-choice-copy">
                                <small>{formatRwf(addOn.priceRwf)}</small>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}

          <section className="menu-engine-section">
            <div className="menu-engine-section-head">
              <h2>Special instructions</h2>
              <span className="menu-engine-chip">Optional</span>
            </div>
            <textarea
              className="menu-engine-notes"
              value={specialInstructions}
              onChange={(event) => setSpecialInstructions(event.target.value)}
              placeholder="Example: extra crispy fries, no onions, sauce on the side"
              rows={4}
              maxLength={240}
            />
          </section>
        </div>
      </section>

      <aside className="menu-engine-summary">
        <h2>Your order</h2>
        <div className="menu-engine-price-lines">
          <div className="menu-engine-qty-row">
            <span className="menu-engine-qty-label">Quantity</span>
            <div className="menu-engine-qty">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={quantity === 1}
              >
                <Minus />
              </button>
              <b>{quantity}</b>
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                disabled={quantity === 99}
              >
                <Plus />
              </button>
            </div>
          </div>
          <div className="menu-engine-total">
            <span>Total</span>
            <b>{formatRwf(totalRwf)}</b>
          </div>
        </div>

        {errors.length > 0 && <p className="menu-engine-error">{errors[0]}</p>}
        {error && <p className="menu-engine-error">{error}</p>}

        <button
          type="button"
          className="menu-engine-add"
          onClick={addToCart}
          disabled={!product.isAvailable}
        >
          {added ? <Check /> : <ShoppingBag />}
          {added ? "Added to cart" : "Add to cart"}
          <ArrowRight />
        </button>
      </aside>
    </main>
  );
}
