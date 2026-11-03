export const DEFAULT_DRINK_IMAGE = "/images/default-drink.jpg";
export const DEFAULT_FOOD_IMAGE = "/images/default-food.jpg";
export const DEFAULT_MARKET_IMAGE = "/images/default-market.svg";
export const DEFAULT_PRODUCT_IMAGE = DEFAULT_FOOD_IMAGE;

const LEGACY_DEFAULT_IMAGE = "/images/default-product.jpg";
const PLACEHOLDER_IMAGES = new Set([
  LEGACY_DEFAULT_IMAGE,
  DEFAULT_DRINK_IMAGE,
  DEFAULT_FOOD_IMAGE,
  DEFAULT_MARKET_IMAGE,
]);

export function hasProductPhoto(imageUrl: string | null | undefined) {
  const savedImage = imageUrl?.trim();
  return Boolean(savedImage && !PLACEHOLDER_IMAGES.has(savedImage));
}
const DRINK_CATEGORY = /(coffee|espresso|tea|chocolate|drink|beverage|juice|smooth|shake|water|soda|mojito|dawa)/i;
const DRINK_NAME = /(coffee|espresso|latte|cappuccino|macchiato|americano|mocha|tea|chai|dawa|juice|smoothie|shake|lemonade|water|soda|cola)/i;

type ProductImageContext = {
  catalogEngine?: "RESTAURANT" | "MARKETPLACE";
  categoryName?: string | null;
  productName?: string | null;
};

export function productImage(
  imageUrl: string | null | undefined,
  context: ProductImageContext = {},
) {
  const savedImage = imageUrl?.trim();
  if (hasProductPhoto(savedImage)) return savedImage!;
  if (context.catalogEngine === "MARKETPLACE") return DEFAULT_MARKET_IMAGE;
  if (
    DRINK_CATEGORY.test(context.categoryName ?? "") ||
    DRINK_NAME.test(context.productName ?? "")
  )
    return DEFAULT_DRINK_IMAGE;
  return DEFAULT_FOOD_IMAGE;
}
