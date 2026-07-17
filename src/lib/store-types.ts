export const COMMERCE_ENGINES = ["RESTAURANT", "RETAIL"] as const;
export type CommerceEngine = (typeof COMMERCE_ENGINES)[number];
export type CatalogEngine = "RESTAURANT" | "MARKETPLACE";

export const OPTIONAL_PRODUCT_FIELDS = [
  "description",
  "image",
  "sku",
  "featured",
  "specialInstructions",
] as const;
export type OptionalProductField = (typeof OPTIONAL_PRODUCT_FIELDS)[number];

export function catalogEngineFor(commerceEngine: string): CatalogEngine {
  return commerceEngine === "RESTAURANT" ? "RESTAURANT" : "MARKETPLACE";
}

export function parseOptionalProductFields(value: string | null | undefined) {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((field): field is OptionalProductField =>
      OPTIONAL_PRODUCT_FIELDS.includes(field as OptionalProductField),
    );
  } catch {
    return [];
  }
}

export function legacyStoreTypeValue(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 40) || "STORE";
}

export type StoreTypeCapabilities = {
  optionalProductFields: OptionalProductField[];
  stockTrackingRequired: boolean;
  ageConfirmationRequired: boolean;
  productUnitsEnabled: boolean;
  brandsEnabled: boolean;
  departmentsEnabled: boolean;
};

export function storeTypeCapabilities(storeType: {
  optionalProductFieldsJson: string;
  stockTrackingRequired: boolean;
  ageConfirmationRequired: boolean;
  productUnitsEnabled: boolean;
  brandsEnabled: boolean;
  departmentsEnabled: boolean;
}): StoreTypeCapabilities {
  return {
    optionalProductFields: parseOptionalProductFields(storeType.optionalProductFieldsJson),
    stockTrackingRequired: storeType.stockTrackingRequired,
    ageConfirmationRequired: storeType.ageConfirmationRequired,
    productUnitsEnabled: storeType.productUnitsEnabled,
    brandsEnabled: storeType.brandsEnabled,
    departmentsEnabled: storeType.departmentsEnabled,
  };
}
