/* eslint-disable @next/next/no-img-element */
import { Coffee, ShoppingBasket, Store } from "lucide-react";

type StoreArtworkProps = {
  name: string;
  type: string;
  compact?: boolean;
  imageUrl?: string | null;
  priority?: boolean;
};

export function StoreArtwork({
  name,
  type,
  compact = false,
  imageUrl,
  priority = false,
}: StoreArtworkProps) {
  const market = type === "MARKET";
  const Icon = name.startsWith("Java")
    ? Coffee
    : market
      ? ShoppingBasket
      : Store;
  const tone = name.startsWith("Java")
    ? "coffee"
    : name.startsWith("Kimironko")
      ? "fresh"
      : "gold";

  return (
    <div className={`store-artwork ${tone} ${compact ? "compact" : ""}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${name} storefront`}
          width={640}
          height={360}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      ) : (
        <>
          <Icon />
          <span>{name.split(" ").slice(0, 2).join(" ")}</span>
        </>
      )}
    </div>
  );
}
