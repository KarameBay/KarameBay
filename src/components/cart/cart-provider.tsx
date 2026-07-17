"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AddResult,
  CART_STORAGE_KEY,
  CartAddOnSelection,
  CartChoiceSelection,
  CartItem,
  CartProduct,
  CartVariantSelection,
} from "@/lib/cart-types";

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  itemsSubtotal: number;
  addItem: (product: CartProduct) => AddResult;
  replaceWith: (product: CartProduct) => void;
  increase: (lineKey: string) => void;
  decrease: (lineKey: string) => void;
  remove: (lineKey: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validVariant(value: unknown): CartVariantSelection | null {
  if (!isRecord(value)) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.id !== "string" ||
    typeof data.name !== "string" ||
    !Number.isInteger(data.priceRwf)
  ) {
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    priceRwf: data.priceRwf as number,
  };
}

function validChoice(value: unknown): CartChoiceSelection | null {
  if (!isRecord(value)) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.groupId !== "string" ||
    typeof data.groupName !== "string" ||
    !Array.isArray(data.optionIds) ||
    !Array.isArray(data.optionNames) ||
    typeof data.selectionMode !== "string" ||
    !Number.isInteger(data.priceAdjustmentRwf)
  ) {
    return null;
  }
  return {
    groupId: data.groupId,
    groupName: data.groupName,
    optionIds: data.optionIds.filter((optionId): optionId is string => typeof optionId === "string"),
    optionNames: data.optionNames.filter((optionName): optionName is string => typeof optionName === "string"),
    selectionMode: data.selectionMode === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
    priceAdjustmentRwf: data.priceAdjustmentRwf as number,
  };
}

function validAddOn(value: unknown): CartAddOnSelection | null {
  if (!isRecord(value)) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.id !== "string" ||
    typeof data.name !== "string" ||
    !Number.isInteger(data.priceRwf)
  ) {
    return null;
  }
  const quantity =
    typeof data.quantity === "number" && Number.isFinite(data.quantity)
      ? Math.max(1, Math.min(99, Math.round(data.quantity)))
      : 1;
  const optionIds = Array.isArray(data.optionIds)
    ? data.optionIds.filter((optionId): optionId is string => typeof optionId === "string" && optionId.length > 0)
    : typeof data.optionId === "string" && data.optionId
      ? [data.optionId]
      : [];
  const optionNames = Array.isArray(data.optionNames)
    ? data.optionNames.filter((optionName): optionName is string => typeof optionName === "string" && optionName.length > 0)
    : typeof data.optionName === "string" && data.optionName
      ? [data.optionName]
      : [];
  return {
    id: data.id,
    name: data.name,
    priceRwf: data.priceRwf as number,
    quantity,
    groupName: typeof data.groupName === "string" && data.groupName ? data.groupName : null,
    groupSelectionMode:
      data.groupSelectionMode === "MULTIPLE"
        ? "MULTIPLE"
        : data.groupSelectionMode === "SINGLE"
          ? "SINGLE"
          : undefined,
    selectionMode:
      data.selectionMode === "MULTIPLE" || optionIds.length > 1
        ? "MULTIPLE"
        : "SINGLE",
    optionIds,
    optionNames,
    optionPriceAdjustmentRwf:
      typeof data.optionPriceAdjustmentRwf === "number" &&
      Number.isFinite(data.optionPriceAdjustmentRwf)
        ? Math.round(data.optionPriceAdjustmentRwf)
        : null,
    optionId: typeof data.optionId === "string" ? data.optionId : null,
    optionName: typeof data.optionName === "string" ? data.optionName : null,
  };
}

function itemKey(item: Pick<CartItem, "id" | "lineKey">) {
  return item.lineKey || item.id;
}

function validItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result: CartItem[] = [];
  let storeId = "";
  for (const candidate of value) {
    if (!isRecord(candidate)) continue;
    const data = candidate as Record<string, unknown>;
    if (
      typeof data.id !== "string" ||
      typeof data.storeId !== "string" ||
      typeof data.name !== "string" ||
      !["RESTAURANT", "MARKETPLACE"].includes(
        typeof data.catalogEngine === "string" ? data.catalogEngine : "",
      ) ||
      !Number.isInteger(data.priceRwf) ||
      !Number.isInteger(data.quantity) ||
      (data.quantity as number) < 1
    ) {
      continue;
    }

    const validItem: CartItem = {
      id: data.id as string,
      lineKey:
        typeof data.lineKey === "string" && data.lineKey
          ? data.lineKey
          : undefined,
      storeId: data.storeId as string,
      storeName:
        typeof data.storeName === "string" && data.storeName
          ? data.storeName
          : "Current store",
      catalogEngine: data.catalogEngine as "RESTAURANT" | "MARKETPLACE",
      name: data.name as string,
      basePriceRwf:
        typeof data.basePriceRwf === "number" &&
        Number.isFinite(data.basePriceRwf)
          ? (data.basePriceRwf as number)
          : undefined,
      priceRwf: data.priceRwf as number,
      containerChargePerUnitRwf:
        typeof data.containerChargePerUnitRwf === "number" &&
        Number.isFinite(data.containerChargePerUnitRwf)
          ? Math.max(0, Math.round(data.containerChargePerUnitRwf))
          : 0,
      containerChargeFlatRwf:
        typeof data.containerChargeFlatRwf === "number" &&
        Number.isFinite(data.containerChargeFlatRwf)
          ? Math.max(0, Math.round(data.containerChargeFlatRwf))
          : 0,
      imageUrl:
        typeof data.imageUrl === "string" ? data.imageUrl : null,
      detailHref:
        typeof data.detailHref === "string" ? data.detailHref : undefined,
      variant: validVariant(data.variant),
      selections: Array.isArray(data.selections)
        ? data.selections.map(validChoice).filter(Boolean) as CartChoiceSelection[]
        : [],
      addOns: Array.isArray(data.addOns)
        ? data.addOns.map(validAddOn).filter(Boolean) as CartAddOnSelection[]
        : [],
      specialInstructions:
        typeof data.specialInstructions === "string"
          ? data.specialInstructions
          : undefined,
      ageConfirmationRequired: data.ageConfirmationRequired === true,
      quantity: Math.min(99, data.quantity as number),
    };

    if (!storeId) storeId = validItem.storeId;
    if (validItem.storeId !== storeId) continue;

    const existing = result.find((entry) => itemKey(entry) === itemKey(validItem));
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + validItem.quantity);
      continue;
    }
    result.push(validItem);
  }
  return result;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let saved: CartItem[] = [];
    try {
      saved = validItems(
        JSON.parse(
          localStorage.getItem(CART_STORAGE_KEY) ??
            localStorage.getItem("karame_cart_v2") ??
            localStorage.getItem("karame_cart") ??
            "[]",
        ),
      );
    } catch {
      saved = [];
    }
    queueMicrotask(() => {
      setItems(saved);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        try {
          setItems(validItems(JSON.parse(event.newValue ?? "[]")));
        } catch {
          setItems([]);
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const addItem = useCallback(
    (product: CartProduct): AddResult => {
      if (items.length && items[0].storeId !== product.storeId) {
        return { ok: false, conflictStoreName: items[0].storeName };
      }
      const lineKey = product.lineKey || product.id;
      setItems((current) => {
        const existing = current.find((item) => itemKey(item) === lineKey);
        return existing
          ? current.map((item) =>
              itemKey(item) === lineKey
                ? { ...item, quantity: Math.min(99, item.quantity + 1) }
                : item,
            )
          : [...current, { ...product, lineKey, quantity: 1 }];
      });
      return { ok: true };
    },
    [items],
  );

  const increase = useCallback(
    (lineKey: string) =>
      setItems((current) =>
        current.map((item) =>
          itemKey(item) === lineKey
            ? { ...item, quantity: Math.min(99, item.quantity + 1) }
            : item,
        ),
      ),
    [],
  );

  const decrease = useCallback(
    (lineKey: string) =>
      setItems((current) =>
        current.map((item) =>
          itemKey(item) === lineKey
            ? { ...item, quantity: Math.max(1, item.quantity - 1) }
            : item,
        ),
      ),
    [],
  );

  const remove = useCallback(
    (lineKey: string) =>
      setItems((current) => current.filter((item) => itemKey(item) !== lineKey)),
    [],
  );

  const clear = useCallback(() => setItems([]), []);
  const replaceWith = useCallback(
    (product: CartProduct) => setItems([{ ...product, lineKey: product.lineKey || product.id, quantity: 1 }]),
    [],
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      itemsSubtotal: items.reduce(
        (sum, item) => sum + item.priceRwf * item.quantity + (item.containerChargeFlatRwf ?? 0),
        0,
      ),
      addItem,
      replaceWith,
      increase,
      decrease,
      remove,
      clear,
    }),
    [items, hydrated, addItem, replaceWith, increase, decrease, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside CartProvider");
  return cart;
}
