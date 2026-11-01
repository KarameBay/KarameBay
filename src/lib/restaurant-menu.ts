export type RestaurantVariant = {
  id: string;
  name: string;
  priceRwf: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
};

export type RestaurantChoiceOption = {
  id: string;
  name: string;
  priceAdjustmentRwf: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type RestaurantChoiceGroup = {
  id: string;
  name: string;
  required: boolean;
  minChoices: number;
  maxChoices: number;
  sortOrder: number;
  options: RestaurantChoiceOption[];
};

export type RestaurantAddOn = {
  id: string;
  name: string;
  priceRwf: number;
  isAvailable: boolean;
  category?: string | null;
  description?: string | null;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  sortOrder?: number;
  groupName?: string | null;
  groupSelectionMode?: "SINGLE" | "MULTIPLE";
  selectionMode?: "SINGLE" | "MULTIPLE";
  options?: {
    id: string;
    name: string;
    priceAdjustmentRwf: number;
    isAvailable: boolean;
    sortOrder: number;
  }[];
};

export type RestaurantMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  basePriceRwf: number;
  containerChargePerUnitRwf: number;
  containerChargeFlatRwf: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { name: string };
  variants: RestaurantVariant[];
  choiceGroups: RestaurantChoiceGroup[];
  addOns: RestaurantAddOn[];
  store: {
    id: string;
    name: string;
    slug: string;
    type: string;
    catalogEngine: string;
    ageConfirmationRequired?: boolean;
  };
};

export type RestaurantSelection = {
  groupId: string;
  groupName: string;
  optionIds: string[];
  optionNames: string[];
  selectionMode: "SINGLE" | "MULTIPLE";
  priceAdjustmentRwf: number;
};

export type RestaurantVariantSelection = {
  id: string;
  name: string;
  priceRwf: number;
};

export type RestaurantAddOnSelection = {
  id: string;
  name: string;
  priceRwf: number;
  quantity: number;
  groupName?: string | null;
  groupSelectionMode?: "SINGLE" | "MULTIPLE";
  selectionMode?: "SINGLE" | "MULTIPLE";
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  optionIds?: string[];
  optionNames?: string[];
  optionPriceAdjustmentRwf?: number | null;
  optionId?: string | null;
  optionName?: string | null;
};

export type RestaurantConfiguration = {
  variant?: RestaurantVariantSelection | null;
  selections: RestaurantSelection[];
  addOns: RestaurantAddOnSelection[];
  specialInstructions?: string;
};

export function choiceInstruction(group: Pick<RestaurantChoiceGroup, "required" | "minChoices" | "maxChoices">) {
  if (group.maxChoices === 1) {
    return group.required
      ? "Select only one option"
      : "Choose 1 option";
  }
  if (group.required) {
    return `Choose at least ${group.minChoices} options`;
  }
  return `Choose up to ${group.maxChoices} options`;
}

export function choiceMode(group: Pick<RestaurantChoiceGroup, "maxChoices">) {
  return group.maxChoices === 1 ? "SINGLE" : "MULTIPLE";
}

export function normalizeRestaurantAddOnSelection(
  addOn: RestaurantAddOnSelection,
) {
  const optionIds =
    addOn.optionIds?.length
      ? [...new Set(addOn.optionIds.filter(Boolean))]
      : addOn.optionId
        ? [addOn.optionId]
        : [];
  const optionNames =
    addOn.optionNames?.length
      ? addOn.optionNames.filter((name): name is string => typeof name === "string")
      : addOn.optionName
        ? [addOn.optionName]
        : [];
  const selectionMode =
    addOn.selectionMode ?? (optionIds.length > 1 ? "MULTIPLE" : "SINGLE");
  return {
    id: addOn.id,
    name: addOn.name,
    priceRwf: addOn.priceRwf,
    quantity: addOn.quantity,
    groupName: addOn.groupName ?? null,
    groupSelectionMode: addOn.groupSelectionMode ?? undefined,
    selectionMode,
    optionIds,
    optionNames,
    optionPriceAdjustmentRwf: Math.round(addOn.optionPriceAdjustmentRwf ?? 0),
  };
}

export function buildRestaurantConfigurationKey(
  productId: string,
  configuration: RestaurantConfiguration,
) {
  const variantKey = configuration.variant ? `${configuration.variant.id}:${configuration.variant.priceRwf}` : "base";
  const selectionsKey = [...configuration.selections]
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map((selection) => `${selection.groupId}:${selection.optionIds.slice().sort().join(",")}`)
    .join("|");
  const addOnsKey = [...configuration.addOns]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((addOn) => {
      const normalized = normalizeRestaurantAddOnSelection(addOn);
      return `${normalized.id}:${normalized.quantity}:${normalized.groupName ?? "-"}:${normalized.groupSelectionMode ?? "-"}:${normalized.selectionMode}:${normalized.optionIds.slice().sort().join(",") || "-"}`;
    })
    .join("|");
  return [productId, variantKey, selectionsKey || "-", addOnsKey || "-"].join("::");
}

export function computeRestaurantUnitPrice(
  product: Pick<RestaurantMenuProduct, "basePriceRwf" | "variants" | "choiceGroups" | "addOns">,
  configuration: RestaurantConfiguration,
) {
  const variantPrice =
    configuration.variant?.priceRwf ??
    product.variants.find((variant) => variant.isDefault)?.priceRwf ??
    product.basePriceRwf;
  const choicesPrice = configuration.selections.reduce(
    (sum, selection) => sum + selection.priceAdjustmentRwf,
    0,
  );
  const addOnsPrice = configuration.addOns.reduce(
    (sum, addOn) => {
      const normalized = normalizeRestaurantAddOnSelection(addOn);
      return (
        sum +
        (normalized.priceRwf + normalized.optionPriceAdjustmentRwf) * normalized.quantity
      );
    },
    0,
  );
  return variantPrice + choicesPrice + addOnsPrice;
}

export function validateRestaurantConfiguration(
  product: Pick<RestaurantMenuProduct, "choiceGroups" | "variants" | "addOns">,
  configuration: RestaurantConfiguration,
) {
  const errors: string[] = [];
  const variant = configuration.variant;
  if (product.variants.length) {
    const selectedVariant = variant
      ? product.variants.find((candidate) => candidate.id === variant.id)
      : product.variants.find((candidate) => candidate.isDefault);
    if (!selectedVariant || !selectedVariant.isAvailable) {
      errors.push("Please choose a valid size or variant.");
    }
  }
  for (const group of product.choiceGroups) {
    const selected = configuration.selections.find(
      (item) => item.groupId === group.id,
    );
    const count = selected?.optionIds.length ?? 0;
    const minimumChoices = group.required
      ? Math.max(1, group.minChoices)
      : group.minChoices;
    if (count < minimumChoices) {
      errors.push(
        group.maxChoices === 1
          ? `Please choose one ${group.name.toLowerCase()}.`
          : `Please choose at least ${minimumChoices} options for ${group.name.toLowerCase()}.`,
      );
      continue;
    }
    if (count > group.maxChoices) {
      errors.push(`Please choose up to ${group.maxChoices} options for ${group.name.toLowerCase()}.`);
    }
  }
  for (const addOn of configuration.addOns) {
    const match = product.addOns.find((candidate) => candidate.id === addOn.id);
    if (!match || !match.isAvailable) {
      errors.push(`Please choose a valid add-on.`);
      continue;
    }
    const selection = normalizeRestaurantAddOnSelection(addOn);
    const maxSelections = match.maxSelections ?? 1;
    const minSelections = match.required ? Math.max(1, match.minSelections ?? 0) : match.minSelections ?? 0;
    if (selection.selectionMode === "SINGLE" && selection.optionIds.length > 1) {
      errors.push(`Please choose only one option for ${match.name.toLowerCase()}.`);
      continue;
    }
    if (selection.optionIds.length < minSelections) {
      errors.push(
        minSelections === 1
          ? `Please choose one option for ${match.name.toLowerCase()}.`
          : `Please choose at least ${minSelections} options for ${match.name.toLowerCase()}.`,
      );
      continue;
    }
    if (selection.optionIds.length > maxSelections) {
      errors.push(`Please choose up to ${maxSelections} options for ${match.name.toLowerCase()}.`);
      continue;
    }
    if (selection.optionIds.length) {
      const optionMatches = selection.optionIds.map((optionId) =>
        match.options?.find((candidate) => candidate.id === optionId),
      );
      if (optionMatches.some((option) => !option || !option.isAvailable)) {
        errors.push(`Please choose a valid option for ${match.name.toLowerCase()}.`);
      }
    }
  }
  const groupedAddOns = new Map<string, RestaurantAddOnSelection[]>();
  for (const addOn of configuration.addOns) {
    const selection = normalizeRestaurantAddOnSelection(addOn);
    const groupName = selection.groupName?.trim() || selection.name;
    const bucket = groupedAddOns.get(groupName) ?? [];
    bucket.push(selection);
    groupedAddOns.set(groupName, bucket);
  }
  for (const [groupName, items] of groupedAddOns) {
    const mode = items.find((item) => item.groupSelectionMode)?.groupSelectionMode ?? "SINGLE";
    if (mode === "SINGLE" && items.length > 1) {
      errors.push(`Please choose only one add-on from ${groupName.toLowerCase()}.`);
    }
  }
  return errors;
}
