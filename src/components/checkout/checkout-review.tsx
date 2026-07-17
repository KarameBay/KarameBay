"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Route,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import {
  DELIVERY_ADDRESS_KEY,
  DELIVERY_ADDRESS_MODE_KEY,
  DELIVERY_DETAILS_KEY,
  DELIVERY_LOCATION_KEY,
  DELIVERY_QUOTE_KEY,
  SavedDeliveryQuote,
  validSavedDeliveryQuote,
} from "@/lib/delivery";
import { formatRwf } from "@/lib/money";
import { productImage } from "@/lib/product-images";

export function CheckoutReview() {
  const cart = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<SavedDeliveryQuote | null>(null);
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(DELIVERY_QUOTE_KEY) ?? "null",
      );
      const savedAddress = localStorage.getItem(DELIVERY_ADDRESS_KEY) ?? "";
      queueMicrotask(() => {
        if (validSavedDeliveryQuote(saved)) setQuote(saved);
        if (savedAddress) setAddress(savedAddress);
      });
    } catch {}
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const requiresAgeConfirmation = cart.items.some((item) => item.ageConfirmationRequired);
    if (!quote || !confirmed || (requiresAgeConfirmation && !ageConfirmed) || !cart.items.length) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            productId: item.id,
            catalogEngine: item.catalogEngine,
            quantity: item.quantity,
            lineKey: item.lineKey ?? item.id,
            priceRwf: item.priceRwf,
            basePriceRwf: item.basePriceRwf ?? item.priceRwf,
            containerChargePerUnitRwf: item.containerChargePerUnitRwf ?? 0,
            containerChargeFlatRwf: item.containerChargeFlatRwf ?? 0,
            variant: item.variant ?? null,
            selections: item.selections ?? [],
            addOns: item.addOns ?? [],
            specialInstructions: item.specialInstructions ?? "",
          })),
          deliveryLatitude: quote.latitude,
          deliveryLongitude: quote.longitude,
          deliveryAddress: address,
          expectedItemsSubtotalRwf: cart.itemsSubtotal,
          expectedDeliveryFeeRwf: quote.deliveryFeeRwf,
          paymentConfirmed: confirmed,
          ageConfirmed,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/customer/login");
        return;
      }
      if (!response.ok) {
        if (data.code === "QUOTE_CHANGED") {
          localStorage.removeItem(DELIVERY_QUOTE_KEY);
          router.push("/checkout/delivery");
          return;
        }
        setError(data.error ?? "Order submission failed.");
        return;
      }
      cart.clear();
      localStorage.removeItem(DELIVERY_QUOTE_KEY);
      if (localStorage.getItem(DELIVERY_ADDRESS_MODE_KEY) !== "save") {
        localStorage.removeItem(DELIVERY_LOCATION_KEY);
        localStorage.removeItem(DELIVERY_ADDRESS_KEY);
        localStorage.removeItem(DELIVERY_DETAILS_KEY);
        localStorage.removeItem(DELIVERY_ADDRESS_MODE_KEY);
      }
      router.replace(`/orders/${data.order.orderNumber}`);
    } catch {
      setError(
        "We could not submit the order. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  if (!cart.hydrated)
    return <div className="checkout-loading">Loading checkout…</div>;
  if (!cart.items.length)
    return (
      <main className="checkout-blocked">
        <h1>Your cart is empty</h1>
        <p>Add products before starting checkout.</p>
        <Link href="/stores">Browse stores</Link>
      </main>
    );
  if (!quote || quote.storeId !== cart.items[0].storeId)
    return (
      <main className="checkout-blocked">
        <MapPin />
        <h1>Delivery location required</h1>
        <p>Select and verify a delivery route before reviewing payment.</p>
        <Link href="/checkout/delivery">Choose delivery location</Link>
      </main>
    );
  const total = cart.itemsSubtotal + quote.deliveryFeeRwf;
  const requiresAgeConfirmation = cart.items.some((item) => item.ageConfirmationRequired);
  return (
    <main className="review-page">
      <Link className="review-back" href="/checkout/delivery">
        <ArrowLeft /> Back to delivery map
      </Link>
      <div className="review-title">
        <span className="catalog-kicker">FINAL REVIEW</span>
        <h1>Review and pay</h1>
        <p>
          Check your order, complete Mobile Money payment, then confirm below.
        </p>
      </div>
      <form onSubmit={submit} className="review-layout">
        <div className="review-left">
          <section className="review-card">
            <header>
              <h2>Your items</h2>
              <span>{cart.itemCount} items</span>
            </header>
            {cart.items.map((item) => (
              <article className="review-item" key={item.lineKey ?? item.id}>
                <div>
                  <img
                    src={productImage(item.imageUrl, { catalogEngine: item.catalogEngine, productName: item.name })}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span>
                  <b>{item.name}</b>
                  <small>
                    {formatRwf(item.priceRwf)} × {item.quantity}
                  </small>
                  {(item.containerChargePerUnitRwf || item.containerChargeFlatRwf) ? (
                    <small>
                      Container charge: {[
                        item.containerChargePerUnitRwf ? `${formatRwf(item.containerChargePerUnitRwf)} each` : "",
                        item.containerChargeFlatRwf ? `${formatRwf(item.containerChargeFlatRwf)} once` : "",
                      ].filter(Boolean).join(" + ")}
                    </small>
                  ) : null}
                  {item.variant && <small>{item.variant.name}</small>}
                  {item.selections?.map((selection) => (
                    <small key={selection.groupId}>
                      {selection.groupName}: {selection.optionNames.join(", ")}
                    </small>
                  ))}
                  {item.addOns?.map((addOn) => (
                    <small key={addOn.id}>
                      {addOn.groupName ? `${addOn.groupName}: ` : "Add-on: "}{addOn.name}
                      {addOn.optionNames?.length
                        ? ` · ${addOn.optionNames.join(", ")}`
                        : addOn.optionName
                          ? ` · ${addOn.optionName}`
                          : ""}
                      {addOn.quantity > 1 ? ` × ${addOn.quantity}` : ""}
                    </small>
                  ))}
                  {item.specialInstructions ? <small>{item.specialInstructions}</small> : null}
                </span>
                <strong>{formatRwf(item.priceRwf * item.quantity + (item.containerChargeFlatRwf ?? 0))}</strong>
              </article>
            ))}
          </section>
          <section className="review-card address-card">
            <header>
              <h2>Delivery address</h2>
              <MapPin />
            </header>
            <label>
              Address or delivery directions
              <textarea
                required
                minLength={5}
                maxLength={240}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Example: Kigali Heights, KG 7 Avenue, entrance near the pharmacy"
              />
            </label>
            <div>
              <span>
                <Route /> {quote.distanceKm.toFixed(1)} km
              </span>
              <span>
                <Clock3 /> About {quote.durationMinutes} min
              </span>
            </div>
          </section>
          <section className="momo-card">
            <div className="momo-brand">
              <span>MoMo</span>
              <div>
                <small>PAY WITH MOBILE MONEY</small>
                <h2>Complete payment on your phone</h2>
              </div>
            </div>
            <a
              className="momo-code"
              href="tel:%2A182%2A8%2A1%2A188671%23"
              aria-label="Open the phone dialer with the Karame Bay MoMo code"
            >
              <span>
                <Smartphone />
              </span>
              <div>
                <small>TAP TO OPEN YOUR PHONE DIALER</small>
                <b>*182*8*1*188671#</b>
              </div>
            </a>
            <div className="momo-name">
              <span>MoMo Pay Name</span>
              <b>Theo</b>
            </div>
            <ol>
              <li>
                <span>1</span>Dial the code using your MTN Mobile Money phone.
              </li>
              <li>
                <span>2</span>Enter the exact order total shown in the summary.
              </li>
              <li>
                <span>3</span>Approve the payment using your Mobile Money PIN.
              </li>
            </ol>
            <label className="payment-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                <b>I confirm that I have completed the payment</b>
                <small>
                  Your payment will be checked by a Karame Bay administrator.
                </small>
              </span>
            </label>
            {requiresAgeConfirmation ? (
              <label className="payment-confirm">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(event) => setAgeConfirmed(event.target.checked)}
                />
                <span>
                  <b>I confirm that I meet the legal age requirement</b>
                  <small>Karame Bay or the rider may request identification at delivery.</small>
                </span>
              </label>
            ) : null}
          </section>
        </div>
        <aside className="review-summary">
          <h2>Order summary</h2>
          <div>
            <span>Items subtotal</span>
            <b>{formatRwf(cart.itemsSubtotal)}</b>
          </div>
          <div>
            <span>Delivery fee</span>
            <b>{formatRwf(quote.deliveryFeeRwf)}</b>
          </div>
          <div className="review-total">
            <span>Grand total</span>
            <b>{formatRwf(total)}</b>
          </div>
          <div className="review-status">
            <CheckCircle2 />
            <span>
              <small>ORDER STATUS</small>
              <b>Pending after submission</b>
            </span>
          </div>
          <div className="review-status">
            <ShieldCheck />
            <span>
              <small>PAYMENT STATUS</small>
              <b>Pending Verification</b>
            </span>
          </div>
          {error && <div className="review-error">{error}</div>}
          <button
            className="place-order"
            disabled={!confirmed || (requiresAgeConfirmation && !ageConfirmed) || address.trim().length < 5 || submitting}
          >
            {submitting ? "Submitting order…" : "Submit order"}
            <ArrowRight />
          </button>
          <p>
            By submitting, you confirm the order and payment details are
            correct.
          </p>
        </aside>
      </form>
    </main>
  );
}
