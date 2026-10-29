"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "./cart-provider";
import { formatRwf } from "@/lib/money";
import { productImage } from "@/lib/product-images";
import { EBM_DETAILS_STORAGE_KEY, EbmDetails } from "@/lib/cart-types";

function itemKey(item: { lineKey?: string; id: string }) {
  return item.lineKey || item.id;
}

export function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const storeName = cart.items[0]?.storeName;
  const currentStoreId = cart.items[0]?.storeId ?? "";
  const [ebm, setEbm] = useState<EbmDetails>({ requested: false, storeId: "", usePhone: false, phone: "", tin: "", ownerName: "", purchaseCode: "" });
  const [ebmOpen, setEbmOpen] = useState(false);
  const [ebmError, setEbmError] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(EBM_DETAILS_STORAGE_KEY) ?? "null");
      if (saved && typeof saved === "object" && (!saved.storeId || !currentStoreId || saved.storeId === currentStoreId)) queueMicrotask(() => setEbm((current) => ({ ...current, ...saved })));
    } catch {}
  }, [currentStoreId]);

  function saveEbm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...ebm, requested: true, storeId: cart.items[0]?.storeId ?? "", phone: ebm.usePhone ? ebm.phone.trim() : ebm.phone.trim() };
    if (!next.tin.trim() || !next.ownerName.trim() || !next.purchaseCode.trim() || (next.usePhone && !next.phone.trim())) {
      setEbmError("Enter the TIN, owner name, purchase code, and phone number when selected.");
      return;
    }
    localStorage.setItem(EBM_DETAILS_STORAGE_KEY, JSON.stringify(next));
    setEbm(next);
    setEbmError("");
    setEbmOpen(false);
  }

  function removeEbm() {
    const cleared = { requested: false, storeId: "", usePhone: false, phone: "", tin: "", ownerName: "", purchaseCode: "" };
    setEbm(cleared);
    localStorage.setItem(EBM_DETAILS_STORAGE_KEY, JSON.stringify(cleared));
  }

  if (!cart.hydrated) {
    return <div className="cart-loading">Loading your cart…</div>;
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
            <button type="button" className="cart-ebm-action" onClick={() => { setEbmError(""); setEbmOpen(true); }}>
              <span><FileCheck2 /></span>
              <span><b>{ebm.requested ? "EBM information saved" : "Request an EBM receipt"}</b><small>{ebm.requested ? `${ebm.ownerName} · TIN ${ebm.tin}` : "Add billing details for this merchant"}</small></span>
              <ArrowRight />
            </button>
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
      {ebmOpen && (
        <div className="cart-ebm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEbmOpen(false); }}>
          <section className="cart-ebm-sheet" role="dialog" aria-modal="true" aria-labelledby="cart-ebm-title">
            <button type="button" className="cart-ebm-close" aria-label="Close EBM information" onClick={() => setEbmOpen(false)}><X /></button>
            <div className="cart-ebm-heading"><span><FileCheck2 /></span><div><h2 id="cart-ebm-title">EBM information</h2><p>Add billing details for {storeName}.</p></div></div>
            <div className="cart-ebm-merchant"><b>{storeName}</b><small>Use the billing details that should appear on your receipt.</small></div>
            <form onSubmit={saveEbm} className="cart-ebm-form">
              <label className="cart-ebm-phone-toggle"><input type="checkbox" checked={ebm.usePhone} onChange={(event) => setEbm((current) => ({ ...current, usePhone: event.target.checked }))} /><span>Use my phone number</span></label>
              {ebm.usePhone && <label>Phone number<input required value={ebm.phone} onChange={(event) => setEbm((current) => ({ ...current, phone: event.target.value }))} placeholder="2507XXXXXXXX" inputMode="tel" /></label>}
              <label>TIN<input required value={ebm.tin} onChange={(event) => setEbm((current) => ({ ...current, tin: event.target.value }))} placeholder="Enter TIN" /></label>
              <label>TIN owner name<input required value={ebm.ownerName} onChange={(event) => setEbm((current) => ({ ...current, ownerName: event.target.value }))} placeholder="Enter TIN owner name" /></label>
              <label>Purchase code<input required value={ebm.purchaseCode} onChange={(event) => setEbm((current) => ({ ...current, purchaseCode: event.target.value }))} placeholder="Enter purchase code" /></label>
              {ebmError && <p className="cart-ebm-error" role="alert">{ebmError}</p>}
              <button type="submit" className="cart-ebm-confirm">Save EBM details</button>
              {ebm.requested && <button type="button" className="cart-ebm-remove" onClick={removeEbm}>Remove saved EBM details</button>}
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


