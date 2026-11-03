/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatRwf } from "@/lib/money";
import { hasProductPhoto, productImage } from "@/lib/product-images";
import { AddToCart } from "./add-to-cart";
import { ProductFallbackArt } from "./product-fallback-art";

type ProductCardData = {
  id: string;
  storeId: string;
  catalogEngine: "RESTAURANT" | "MARKETPLACE";
  name: string;
  priceRwf: number;
  containerChargePerUnitRwf?: number;
  containerChargeFlatRwf?: number;
  unitLabel: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { name: string };
};

export function ProductCard({
  product,
  storeName,
  detailHref,
  ageConfirmationRequired = false,
}: {
  product: ProductCardData;
  storeName: string;
  detailHref?: string;
  ageConfirmationRequired?: boolean;
}) {
  const imageSrc = productImage(product.imageUrl, {
    catalogEngine: product.catalogEngine,
    categoryName: product.category.name,
    productName: product.name,
  });
  const usesPlaceholder = !hasProductPhoto(product.imageUrl);
  const cardContent = (
    <>
      <div className="catalog-product-image">
        {usesPlaceholder ? (
          <ProductFallbackArt category={product.category.name} restaurant={product.catalogEngine === "RESTAURANT"} />
        ) : (
          <img src={imageSrc} alt={product.name} width={480} height={360} loading="lazy" decoding="async" />
        )}
        <em className={product.isAvailable ? "available" : "unavailable"}>
          {product.isAvailable ? "Available" : "Unavailable"}
        </em>
      </div>
      <div className="catalog-product-body">
        <small>{product.category.name}</small>
        <h3>{product.name}</h3>
        <p>{product.unitLabel ?? "Per item"}</p>
        <strong>{formatRwf(product.priceRwf)}</strong>
      </div>
    </>
  );

  return (
    <article className="catalog-product-card">
      {product.catalogEngine === "RESTAURANT" && detailHref ? (
        <Link href={detailHref} prefetch={false} className="catalog-product-link" aria-label={`View ${product.name} options`}>
          {cardContent}
          <span className="catalog-product-view">View options <span aria-hidden="true">→</span></span>
        </Link>
      ) : (
        cardContent
      )}
      {product.catalogEngine !== "RESTAURANT" ? (
        <div className="catalog-product-actions">
          <AddToCart
            product={{
              id: product.id,
              storeId: product.storeId,
              storeName,
              catalogEngine: product.catalogEngine,
              name: product.name,
              priceRwf: product.priceRwf,
              containerChargePerUnitRwf: product.containerChargePerUnitRwf ?? 0,
              containerChargeFlatRwf: product.containerChargeFlatRwf ?? 0,
              imageUrl: imageSrc,
              ageConfirmationRequired,
            }}
            disabled={!product.isAvailable}
          />
        </div>
      ) : null}
    </article>
  );
}
