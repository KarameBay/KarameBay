export const PRODUCTION_CATALOG_TRANSFER_VERSION = 1;

export const PRESERVED_TABLES = [
  "user",
  "storeType",
  "store",
  "platformSetting",
  "businessProfile",
  "restaurantProfile",
  "restaurantCategory",
  "restaurantProduct",
  "restaurantVariant",
  "restaurantChoiceGroup",
  "restaurantChoiceOption",
  "restaurantAddOn",
  "restaurantAddOnOption",
  "restaurantProductAddOn",
  "restaurantComboComponent",
  "marketplaceProfile",
  "marketplaceDepartment",
  "marketplaceCategory",
  "marketplaceProduct",
  "marketplaceProductUnit",
  "marketplaceInventory",
  "marketplaceInventoryMovement",
  "category",
  "product",
  "parcelCategory",
  "parcelSizeDefinition",
  "parcelVehicleCapacity",
  "parcelPricingSetting",
  "parcelProhibitedItemRule",
  "parcelReferenceCounter",
] as const;

export type PreservedTable = (typeof PRESERVED_TABLES)[number];

export const PRESERVED_TABLE_LABELS: Record<PreservedTable, string> = {
  user: "User",
  storeType: "StoreType",
  store: "Store",
  platformSetting: "PlatformSetting",
  businessProfile: "BusinessProfile",
  restaurantProfile: "RestaurantProfile",
  restaurantCategory: "RestaurantCategory",
  restaurantProduct: "RestaurantProduct",
  restaurantVariant: "RestaurantVariant",
  restaurantChoiceGroup: "RestaurantChoiceGroup",
  restaurantChoiceOption: "RestaurantChoiceOption",
  restaurantAddOn: "RestaurantAddOn",
  restaurantAddOnOption: "RestaurantAddOnOption",
  restaurantProductAddOn: "RestaurantProductAddOn",
  restaurantComboComponent: "RestaurantComboComponent",
  marketplaceProfile: "MarketplaceProfile",
  marketplaceDepartment: "MarketplaceDepartment",
  marketplaceCategory: "MarketplaceCategory",
  marketplaceProduct: "MarketplaceProduct",
  marketplaceProductUnit: "MarketplaceProductUnit",
  marketplaceInventory: "MarketplaceInventory",
  marketplaceInventoryMovement: "MarketplaceInventoryMovement",
  category: "Category",
  product: "Product",
  parcelCategory: "ParcelCategory",
  parcelSizeDefinition: "ParcelSizeDefinition",
  parcelVehicleCapacity: "ParcelVehicleCapacity",
  parcelPricingSetting: "ParcelPricingSetting",
  parcelProhibitedItemRule: "ParcelProhibitedItemRule",
  parcelReferenceCounter: "ParcelReferenceCounter",
};

export const IMPORT_ORDER: PreservedTable[] = [
  "user",
  "storeType",
  "store",
  "platformSetting",
  "businessProfile",
  "restaurantProfile",
  "restaurantCategory",
  "restaurantProduct",
  "restaurantVariant",
  "restaurantChoiceGroup",
  "restaurantChoiceOption",
  "restaurantAddOn",
  "restaurantAddOnOption",
  "restaurantProductAddOn",
  "restaurantComboComponent",
  "marketplaceProfile",
  "marketplaceDepartment",
  "marketplaceCategory",
  "marketplaceProduct",
  "marketplaceProductUnit",
  "marketplaceInventory",
  "marketplaceInventoryMovement",
  "category",
  "product",
  "parcelCategory",
  "parcelSizeDefinition",
  "parcelVehicleCapacity",
  "parcelPricingSetting",
  "parcelProhibitedItemRule",
  "parcelReferenceCounter",
];

export type ProductionCatalogExport = {
  version: number;
  exportedAt: string;
  source: {
    app: "karame-bay";
    purpose: "production-catalog-transfer";
  };
  counts: Record<PreservedTable, number>;
  data: Record<PreservedTable, unknown[]>;
};

export function revivePrismaDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => revivePrismaDates(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (
        typeof entry === "string" &&
        /\d{4}-\d{2}-\d{2}T/.test(entry) &&
        (key.endsWith("At") || key.endsWith("Date"))
      ) {
        return [key, new Date(entry)];
      }
      return [key, revivePrismaDates(entry)];
    }),
  );
}
