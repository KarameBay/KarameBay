export const CART_STORAGE_KEY = "karame_customer_cart";

export type CartChoiceSelection = {
  groupId: string;
  groupName: string;
  optionIds: string[];
  optionNames: string[];
  selectionMode: "SINGLE" | "MULTIPLE";
  priceAdjustmentRwf: number;
};

export type CartVariantSelection = {
  id: string;
  name: string;
  priceRwf: number;
};

export type CartAddOnSelection = {
  id: string;
  name: string;
  priceRwf: number;
  quantity: number;
  groupName?: string | null;
  groupSelectionMode?: "SINGLE" | "MULTIPLE";
  selectionMode?: "SINGLE" | "MULTIPLE";
  optionIds?: string[];
  optionNames?: string[];
  optionPriceAdjustmentRwf?: number | null;
  optionId?: string | null;
  optionName?: string | null;
};

export type CartProduct = {
  id: string;
  lineKey?: string;
  storeId: string;
  storeName: string;
  catalogEngine: "RESTAURANT" | "MARKETPLACE";
  name: string;
  basePriceRwf?: number;
  priceRwf: number;
  imageUrl: string | null;
  detailHref?: string;
  variant?: CartVariantSelection | null;
  selections?: CartChoiceSelection[];
  addOns?: CartAddOnSelection[];
  specialInstructions?: string;
};

export type CartItem = CartProduct & {
  quantity: number;
};

export type AddResult = { ok: true } | { ok: false; conflictStoreName: string };
