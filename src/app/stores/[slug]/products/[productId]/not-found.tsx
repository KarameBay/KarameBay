import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <main className="product-unavailable-page">
      <section className="product-unavailable-card" aria-labelledby="product-unavailable-title">
        <span className="product-unavailable-icon" aria-hidden="true">
          <SearchX />
        </span>
        <span className="catalog-kicker">PRODUCT UNAVAILABLE</span>
        <h1 id="product-unavailable-title">This item is no longer on the menu</h1>
        <p>
          The product may have been removed or updated. Return to the restaurant menu to see
          the latest available items.
        </p>
        <Link href="/stores" className="product-unavailable-link">
          <ArrowLeft />
          Back to store directory
        </Link>
      </section>
    </main>
  );
}
