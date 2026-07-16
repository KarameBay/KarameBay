/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatRwf } from "@/lib/catalog";
import { productImage } from "@/lib/product-images";
import { AddToCart } from "./add-to-cart";

type ProductCardData = {
  id: string;
  storeId: string;
  catalogEngine: "RESTAURANT" | "MARKETPLACE";
  name: string;
  priceRwf: number;
  unitLabel: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { name: string };
};

export function ProductCard({
  product,
  storeName,
  detailHref,
}: {
  product: ProductCardData;
  storeName: string;
  detailHref?: string;
}) {
  const imageSrc = productImage(product.imageUrl, {
    catalogEngine: product.catalogEngine,
    categoryName: product.category.name,
    productName: product.name,
  });
  const usesPlaceholder = imageSrc.includes("/images/default-");
  const cardContent = (
    <>
      <div className="catalog-product-image">
        <img
          src={imageSrc}
          alt={product.name}
          width={480}
          height={360}
          className={usesPlaceholder ? "placeholder" : undefined}
          loading="lazy"
          decoding="async"
        />
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
        <Link href={detailHref} className="catalog-product-link">
          {cardContent}
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
              imageUrl: imageSrc,
            }}
            disabled={!product.isAvailable}
          />
        </div>
      ) : null}
    </article>
  );
}
