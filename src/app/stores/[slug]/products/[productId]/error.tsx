"use client";

import Link from "next/link";

export default function ProductError({ reset }: { reset: () => void }) {
  return (
    <main className="catalog-product-state">
      <div className="catalog-product-state-card">
        <div>
          <span className="catalog-kicker">KARAME BAY</span>
          <h1>We couldn&apos;t open this product</h1>
          <p>Please try again. You can also return to the shops and choose another item.</p>
          <div className="catalog-product-state-actions">
            <button type="button" onClick={reset}>Try again</button>
            <Link href="/stores">All shops</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
