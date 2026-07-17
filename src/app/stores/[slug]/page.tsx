import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Package,
  Search,
  Star,
  Store as StoreIcon,
} from "lucide-react";
import { BrowseHeader } from "@/components/catalog/browse-header";
import { ProductCard } from "@/components/catalog/product-card";
import { StoreArtwork } from "@/components/catalog/store-artwork";
import { getStoreBySlug, getStoreCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
};

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const [catalog, ratingSummary, totalReviews, latestReviews] = await Promise.all([
    getStoreCatalog(store.id, { category: query.category, query: query.q, page: Number(query.page) || 1 }),
    db.review.aggregate({ where: { storeId: store.id, moderationStatus: "VISIBLE" }, _avg: { storeRating: true } }),
    db.review.count({ where: { storeId: store.id, moderationStatus: "VISIBLE" } }),
    db.review.findMany({ where: { storeId: store.id, moderationStatus: "VISIBLE" }, select: { id: true, storeRating: true, writtenReview: true, createdAt: true, customer: { select: { firstName: true, lastName: true } }, adminReply: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const href = (page: number) =>
    `/stores/${slug}?${new URLSearchParams({ ...query, page: String(page) }).toString()}`;
  return (
    <>
      <BrowseHeader />
      <main className="catalog-page">
        <section className="catalog-store-hero">
          <div className="catalog-cover">
            <StoreArtwork
              name={store.name}
              type={store.storeType?.name ?? store.type}
              imageUrl={store.coverUrl ?? store.logoUrl}
              priority
            />
          </div>
          <div className="catalog-store-info">
            <Link href="/stores" className="catalog-back">
              <ArrowLeft /> All stores
            </Link>
            <div className="catalog-store-title">
              <StoreArtwork
                name={store.name}
                type={store.storeType?.name ?? store.type}
                imageUrl={store.logoUrl ?? store.coverUrl}
                compact
                priority
              />
              <div>
                <span
                  className={`status-pill ${store.isOpen ? "open" : "closed"}`}
                >
                  <i />
                  {store.isOpen ? "Open now" : "Closed"}
                </span>
                <h1>{store.name}</h1>
                <p>{store.description}</p>
                <div>
                  <span>
                    <StoreIcon />
                    {store.storeType?.name ?? "Store"}
                  </span>
                  <span>
                    <Clock3 />
                    {store.opensAt}–{store.closesAt} Kigali time
                  </span>
                  <span>
                    <Clock3 />
                    {store.estimatedDeliveryMinutes - 5}–
                    {store.estimatedDeliveryMinutes + 5} min delivery
                  </span>
                  <span>
                    <Package />
                    {store._count.products} products
                  </span>
                  <span><Star /> {(ratingSummary._avg.storeRating ?? 0).toFixed(1)} · {totalReviews} {totalReviews === 1 ? "review" : "reviews"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="catalog-content">
          <form className="catalog-search">
            <Search />
            <input
              name="q"
              defaultValue={query.q}
              placeholder={`Search in ${store.name}`}
            />
            {query.category && (
              <input type="hidden" name="category" value={query.category} />
            )}
            <button>Search</button>
          </form>
          <nav className="catalog-categories">
            <Link
              className={!query.category ? "active" : ""}
              href={`/stores/${slug}`}
            >
              All <span>{store._count.products}</span>
            </Link>
            {catalog.categories.map((category) => (
              <Link
                className={query.category === category.slug ? "active" : ""}
                href={`/stores/${slug}?category=${category.slug}`}
                key={category.id}
              >
                {category.name}
                <span>{category._count.products}</span>
              </Link>
            ))}
          </nav>
          <div className="catalog-heading">
            <div>
              <span className="catalog-kicker">CATALOG</span>
              <h2>
                {query.category
                  ? catalog.categories.find(
                      (category) => category.slug === query.category,
                    )?.name
                  : "All products"}
              </h2>
            </div>
            <p>
              {catalog.total} {catalog.total === 1 ? "product" : "products"}
            </p>
          </div>
          {catalog.products.length ? (
            <div className="catalog-grid">
              {catalog.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  storeName={store.name}
                  detailHref={
                    product.catalogEngine === "RESTAURANT"
                      ? `/stores/${slug}/products/${product.id}`
                      : undefined
                  }
                  ageConfirmationRequired={store.storeType?.ageConfirmationRequired ?? false}
                />
              ))}
            </div>
          ) : (
            <div className="catalog-empty">
              <Search />
              <h3>No products found</h3>
              <p>Try another search or category.</p>
            </div>
          )}
          {catalog.pages > 1 && (
            <nav className="catalog-pages">
              <Link
                aria-disabled={catalog.page === 1}
                href={href(catalog.page - 1)}
              >
                <ChevronLeft /> Previous
              </Link>
              <span>
                Page {catalog.page} of {catalog.pages}
              </span>
              <Link
                aria-disabled={catalog.page === catalog.pages}
                href={href(catalog.page + 1)}
              >
                Next <ChevronRight />
              </Link>
            </nav>
          )}
          <section className="store-reviews-section">
            <div className="catalog-heading"><div><span className="catalog-kicker">CUSTOMER REVIEWS</span><h2>Latest verified reviews</h2></div><p>{(ratingSummary._avg.storeRating ?? 0).toFixed(1)} / 5 · {totalReviews} total</p></div>
            {latestReviews.length ? <div className="store-review-grid">{latestReviews.map((review) => <article key={review.id}><span className="review-stars" aria-label={`${review.storeRating} out of 5 stars`}>{[1,2,3,4,5].map((value) => <Star key={value} className={value <= review.storeRating ? "filled" : ""} />)}</span><h3>{review.customer.firstName} {review.customer.lastName.slice(0, 1)}.</h3>{review.writtenReview && <p>{review.writtenReview}</p>}<small>Verified order · {review.createdAt.toLocaleDateString("en-RW", { dateStyle: "medium" })}</small>{review.adminReply && <blockquote><b>Response from Karame Bay</b>{review.adminReply}</blockquote>}</article>)}</div> : <div className="catalog-empty"><Star /><h3>No reviews yet</h3><p>The first delivered-order review will appear here.</p></div>}
          </section>
        </section>
      </main>
    </>
  );
}
