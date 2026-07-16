import Link from "next/link";
import { ArrowUpRight, Clock3, Package, Store as StoreIcon } from "lucide-react";
import { StoreArtwork } from "./store-artwork";

type StoreCardData = {
  slug: string;
  name: string;
  type: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  estimatedDeliveryMinutes: number;
  logoUrl: string | null;
  coverUrl: string | null;
  _count: { products: number };
};

export function StoreCard({ store }: { store: StoreCardData }) {
  return (
    <Link href={`/stores/${store.slug}`} className="browse-store-card">
      <StoreArtwork
        name={store.name}
        type={store.type}
        imageUrl={store.coverUrl ?? store.logoUrl}
      />
      <div className="browse-store-content">
        <div className="browse-store-top">
          <span className={`status-pill ${store.isOpen ? "open" : "closed"}`}>
            <i />
            {store.isOpen ? "Open" : "Closed"}
          </span>
          <ArrowUpRight />
        </div>
        <h2>{store.name}</h2>
        <p>
          <StoreIcon />
          {store.type === "RESTAURANT" ? "Restaurant & Coffee" : "Fresh Market"}
        </p>
        <div className="browse-store-meta">
          <span>
            <Clock3 />
            {store.estimatedDeliveryMinutes - 5}&ndash;
            {store.estimatedDeliveryMinutes + 5} min
          </span>
          <span>
            <Package />
            {store._count.products} products
          </span>
        </div>
      </div>
    </Link>
  );
}
