"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useCart } from "./cart-provider";
import { formatRwf } from "@/lib/catalog";
import { productImage } from "@/lib/product-images";

function itemKey(item: { lineKey?: string; id: string }) {
  return item.lineKey || item.id;
}

export function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const storeName = cart.items[0]?.storeName;

  if (!cart.hydrated) {
    return <div className="cart-loading">Loading your cartâ€¦</div>;
  }

  return (
    <main className="cart-page">
      <Link href="/stores" className="cart-back">
        <ArrowLeft /> Continue shopping
      </Link>
      <div className="cart-page-title">
        <span className="catalog-kicker">YOUR ORDER</span>
        <h1>Shopping cart</h1>
        <p>
          {cart.itemCount
            ? `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"} from ${storeName}`
            : "Your cart is ready for something good."}
        </p>
      </div>
      {!cart.items.length ? (
        <section className="cart-empty">
          <span>
            <ShoppingBag />
          </span>
          <h2>Your cart is empty</h2>
          <p>Browse the stores and add a few favourites.</p>
          <Link href="/stores">
            Browse stores <ArrowRight />
          </Link>
          <button disabled>Checkout</button>
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-items">
            <header>
              <div>
                <span className="cart-store-mark">
                  <ShoppingBag />
                </span>
                <span>
                  <small>ORDERING FROM</small>
                  <b>{storeName}</b>
                </span>
              </div>
              <button onClick={cart.clear}>Clear cart</button>
            </header>

            {cart.items.map((item) => (
              <article className="cart-item" key={itemKey(item)}>
                <div className="cart-item-image">
                  <img
                    src={productImage(item.imageUrl, { catalogEngine: item.catalogEngine, productName: item.name })}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="cart-item-name">
                  <h2>{item.name}</h2>
                  <p>{formatRwf(item.priceRwf)} each</p>
                  {(item.containerChargePerUnitRwf || item.containerChargeFlatRwf) ? (
                    <small>
                      Container charge: {[
                        item.containerChargePerUnitRwf ? `${formatRwf(item.containerChargePerUnitRwf)} each` : "",
                        item.containerChargeFlatRwf ? `${formatRwf(item.containerChargeFlatRwf)} once` : "",
                      ].filter(Boolean).join(" + ")}
                    </small>
                  ) : null}
                  {item.variant && <small>{item.variant.name}</small>}
                  {item.selections?.length ? (
                    <div className="cart-item-selections">
                      {item.selections.map((selection) => (
                        <small key={selection.groupId}>
                          {selection.groupName}: {selection.optionNames.join(", ")}
                        </small>
                      ))}
                    </div>
                  ) : null}
                  {item.addOns?.length ? (
                    <div className="cart-item-selections">
                      {item.addOns.map((addOn) => (
                        <small key={addOn.id}>
                          {addOn.groupName ? `${addOn.groupName}: ` : "Add-on: "}{addOn.name}
                          {addOn.optionNames?.length
                            ? ` · ${addOn.optionNames.join(", ")}`
                            : addOn.optionName
                              ? ` · ${addOn.optionName}`
                              : ""}{addOn.quantity > 1 ? ` × ${addOn.quantity}` : ""}
                        </small>
                      ))}
                    </div>
                  ) : null}
                  {item.specialInstructions ? (
                    <small>{item.specialInstructions}</small>
                  ) : null}
                  <button onClick={() => cart.remove(itemKey(item))}>
                    <Trash2 /> Remove
                  </button>
                </div>
                <div
                  className="cart-quantity"
                  aria-label={`Quantity for ${item.name}`}
                >
                  <button
                    onClick={() => cart.decrease(itemKey(item))}
                    disabled={item.quantity === 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus />
                  </button>
                  <b>{item.quantity}</b>
                  <button
                    onClick={() => cart.increase(itemKey(item))}
                    disabled={item.quantity === 99}
                    aria-label="Increase quantity"
                  >
                    <Plus />
                  </button>
                </div>
                <div className="cart-line-total">
                  <small>SUBTOTAL</small>
                  <strong>{formatRwf(item.priceRwf * item.quantity + (item.containerChargeFlatRwf ?? 0))}</strong>
                </div>
              </article>
            ))}
          </section>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <div>
              <span>Items subtotal</span>
              <strong>{formatRwf(cart.itemsSubtotal)}</strong>
            </div>
            <p>Delivery details and fee are added at checkout.</p>
            <button
              className="cart-checkout"
              disabled={!cart.items.length}
              onClick={() => router.push("/checkout/delivery")}
            >
              Continue to checkout <ArrowRight />
            </button>
            <small>One store per checkout</small>
          </aside>
        </div>
      )}
    </main>
  );
}


