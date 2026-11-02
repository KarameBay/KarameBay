export const CART_STORAGE_KEY = "karame_customer_cart";
export const EBM_DETAILS_STORAGE_KEY = "karame_customer_ebm_details";

export type EbmDetails = {
  requested: boolean;
  storeId?: string;
  usePhone: boolean;
  phone: string;
  tin: string;
  ownerName: string;
  purchaseCode: string;
};

export function readStoredEbm(value: unknown, storeId: string): EbmDetails | null {
  if (!storeId || !value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.storeId !== storeId) return null;
  const usePhone = data.usePhone === true;
  const phone = typeof data.phone === "string" ? data.phone : "";
  const tin = typeof data.tin === "string" ? data.tin : "";
  const ownerName = typeof data.ownerName === "string" ? data.ownerName : "";
  return {
    requested: data.requested === true && Boolean(ownerName.trim()) && Boolean((usePhone ? phone : tin).trim()),
    storeId,
    usePhone,
    phone: usePhone ? phone : "",
    tin: usePhone ? "" : tin,
    ownerName,
    purchaseCode: typeof data.purchaseCode === "string" ? data.purchaseCode : "",
  };
}

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
  containerChargePerUnitRwf?: number;
  containerChargeFlatRwf?: number;
  imageUrl: string | null;
  detailHref?: string;
  variant?: CartVariantSelection | null;
  selections?: CartChoiceSelection[];
  addOns?: CartAddOnSelection[];
  specialInstructions?: string;
  ageConfirmationRequired?: boolean;
};

export type CartItem = CartProduct & {
  quantity: number;
};

export type AddResult = { ok: true } | { ok: false; conflictStoreName: string };
