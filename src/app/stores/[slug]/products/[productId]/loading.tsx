export default function ProductLoading() {
  return (
    <main className="catalog-product-state" role="status" aria-live="polite">
      <div className="catalog-product-state-card">
        <span className="catalog-product-state-art" aria-hidden="true" />
        <div>
          <span className="catalog-kicker">KARAME BAY</span>
          <h1>Opening product…</h1>
          <p>Loading this partner&apos;s choices and prices.</p>
        </div>
      </div>
    </main>
  );
}
