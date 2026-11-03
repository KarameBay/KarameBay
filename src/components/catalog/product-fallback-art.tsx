import { Coffee, GlassWater, ShoppingBasket, UtensilsCrossed } from "lucide-react";

export function ProductFallbackArt({ category, restaurant = false }: { category: string; restaurant?: boolean }) {
  const Icon = /beer|wine|spirit|liquor|drink|juice|soda|water/i.test(category)
    ? GlassWater
    : /coffee|tea|espresso|chocolate/i.test(category)
      ? Coffee
      : restaurant
        ? UtensilsCrossed
        : ShoppingBasket;

  return (
    <div className="catalog-product-fallback" aria-label="Product photo unavailable">
      <span className="catalog-product-fallback-mark" aria-hidden="true"><Icon /></span>
      <span className="catalog-product-fallback-label">{category}</span>
      <small>Karame Bay</small>
    </div>
  );
}
