"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
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
import { hasProductPhoto, productImage } from "@/lib/product-images";
import { ProductFallbackArt } from "@/components/catalog/product-fallback-art";
import { EBM_DETAILS_STORAGE_KEY, EbmDetails, readStoredEbm } from "@/lib/cart-types";

const emptyEbm: EbmDetails = { requested: false, usePhone: false, phone: "", tin: "", ownerName: "", purchaseCode: "" };
const CHECKOUT_REQUEST_KEY = "karame_checkout_request_v1";

async function checkoutRequestId(
  payload: object,
  current: React.MutableRefObject<{ signature: string; id: string } | null>,
) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (current.current?.signature === signature) return current.current.id;
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHECKOUT_REQUEST_KEY) ?? "null");
    if (
      saved?.signature === signature &&
      typeof saved.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id)
    ) {
      current.current = { signature, id: saved.id };
      return saved.id;
    }
  } catch {}
  const id = crypto.randomUUID();
  current.current = { signature, id };
  try { sessionStorage.setItem(CHECKOUT_REQUEST_KEY, JSON.stringify({ signature, id })); } catch {}
  return id;
}

export function CheckoutReview() {
  const cart = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<SavedDeliveryQuote | null>(null);
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ebmDetails, setEbmDetails] = useState<EbmDetails>(emptyEbm);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const checkoutRequestRef = useRef<{ signature: string; id: string } | null>(null);
  const pendingRequestBodyRef = useRef<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState("");
  const [submissionUncertain, setSubmissionUncertain] = useState(false);
  const [error, setError] = useState("");
  const currentStoreId = cart.items[0]?.storeId ?? "";
  const activeEbm = ebmDetails.storeId === currentStoreId ? ebmDetails : emptyEbm;
  useEffect(() => {
    let savedQuote: unknown = null;
    let savedAddress = "";
    let savedEbm: unknown = null;
    try {
      savedQuote = JSON.parse(localStorage.getItem(DELIVERY_QUOTE_KEY) ?? "null");
    } catch {}
    try {
      savedAddress = localStorage.getItem(DELIVERY_ADDRESS_KEY) ?? "";
    } catch {}
    try {
      savedEbm = JSON.parse(localStorage.getItem(EBM_DETAILS_STORAGE_KEY) ?? "null");
    } catch {}
    queueMicrotask(() => {
      if (validSavedDeliveryQuote(savedQuote)) setQuote(savedQuote);
      if (savedAddress) setAddress(savedAddress);
      if (currentStoreId) setEbmDetails(readStoredEbm(savedEbm, currentStoreId) ?? emptyEbm);
    });
  }, [currentStoreId]);
  async function submit(event?: FormEvent, retryUncertain = false) {
    event?.preventDefault();
    if (submittingRef.current || placedOrderNumber || (submissionUncertain && !retryUncertain)) return;
    if (retryUncertain && !pendingRequestBodyRef.current) return;
    const requiresAgeConfirmation = cart.items.some((item) => item.ageConfirmationRequired);
    if (!retryUncertain && (!quote || !confirmed || (requiresAgeConfirmation && !ageConfirmed) || !cart.items.length)) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(retryUncertain ? "Checking your original order…" : "");
    let placed = false;
    let requestStarted = false;
    try {
      const payload = !retryUncertain && quote ? {
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
        ebmRequested: activeEbm.requested,
        ebmUsePhone: activeEbm.usePhone,
        ebmPhone: activeEbm.phone || null,
        ebmTin: activeEbm.tin || null,
        ebmOwnerName: activeEbm.ownerName || null,
        ebmPurchaseCode: activeEbm.purchaseCode || null,
        expectedItemsSubtotalRwf: cart.itemsSubtotal,
        expectedDeliveryFeeRwf: quote.deliveryFeeRwf,
        paymentConfirmed: confirmed,
        ageConfirmed,
      } : null;
      const requestBody = retryUncertain
        ? pendingRequestBodyRef.current!
        : JSON.stringify({ ...payload, checkoutRequestId: await checkoutRequestId(payload!, checkoutRequestRef) });
      pendingRequestBodyRef.current = requestBody;
      requestStarted = true;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/customer/login");
        return;
      }
      if (!response.ok) {
        if (retryUncertain) {
          setSubmissionUncertain(true);
          setError(response.status === 429
            ? "Please wait a moment, then retry this order or check your orders."
            : "We still could not confirm this order. Retry it or check your orders.");
          return;
        }
        if (data.code === "QUOTE_CHANGED") {
          pendingRequestBodyRef.current = null;
          setSubmissionUncertain(false);
          try { localStorage.removeItem(DELIVERY_QUOTE_KEY); } catch {}
          router.push("/checkout/delivery");
          return;
        }
        if (response.status >= 500) {
          setSubmissionUncertain(true);
          setError("We could not confirm the result. Retry this order safely or check your orders.");
          return;
        }
        pendingRequestBodyRef.current = null;
        setSubmissionUncertain(false);
        setError(data.error ?? "Order submission failed.");
        return;
      }
      const orderNumber = data?.order?.orderNumber;
      if (typeof orderNumber !== "string" || !orderNumber) {
        setSubmissionUncertain(true);
        setError("We could not confirm the result. Retry this order safely or check your orders.");
        return;
      }
      placed = true;
      pendingRequestBodyRef.current = null;
      setPlacedOrderNumber(orderNumber);
      cart.clear();
      try {
        sessionStorage.removeItem(CHECKOUT_REQUEST_KEY);
        localStorage.removeItem(EBM_DETAILS_STORAGE_KEY);
        localStorage.removeItem(DELIVERY_QUOTE_KEY);
        if (localStorage.getItem(DELIVERY_ADDRESS_MODE_KEY) !== "save") {
          localStorage.removeItem(DELIVERY_LOCATION_KEY);
          localStorage.removeItem(DELIVERY_ADDRESS_KEY);
          localStorage.removeItem(DELIVERY_DETAILS_KEY);
          localStorage.removeItem(DELIVERY_ADDRESS_MODE_KEY);
        }
      } catch {
        // The order is already placed; browser cleanup must not trigger a retry.
      }
      router.replace(`/orders/${orderNumber}`);
    } catch {
      if (!placed) {
        setSubmissionUncertain(requestStarted);
        setError(requestStarted
          ? "We could not confirm the result. Retry this order safely or check your orders."
          : "We could not start checkout. Please try again.");
      }
    } finally {
      if (!placed) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }
  if (!cart.hydrated)
    return <div className="checkout-loading">Loading checkout…</div>;
  if (placedOrderNumber)
    return (
      <main className="checkout-blocked" role="status">
        <CheckCircle2 aria-hidden="true" />
        <h1>Order received</h1>
        <p>Opening your order details now.</p>
        <Link href={`/orders/${placedOrderNumber}`}>View order</Link>
      </main>
    );
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
  const actionHint = !confirmed
    ? "Confirm your Mobile Money payment above to submit."
    : requiresAgeConfirmation && !ageConfirmed
      ? "Confirm the age requirement above to submit."
      : address.trim().length < 5
        ? "Add delivery directions to submit."
        : "";
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
                  {hasProductPhoto(item.imageUrl) ? (
                    <img src={productImage(item.imageUrl, { catalogEngine: item.catalogEngine, productName: item.name })} alt={item.name} loading="lazy" decoding="async" />
                  ) : (
                    <ProductFallbackArt category={item.catalogEngine === "RESTAURANT" ? "Menu item" : "Product"} restaurant={item.catalogEngine === "RESTAURANT"} />
                  )}
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
          <section className="ebm-card" aria-labelledby="ebm-title">
            <div className="ebm-card-icon"><FileCheck2 aria-hidden="true" /></div>
            <div className="ebm-card-copy">
              <h2 id="ebm-title">EBM receipt</h2>
              <p>{activeEbm.requested ? `Requested for ${activeEbm.ownerName} · ${activeEbm.usePhone ? `Phone ${activeEbm.phone}` : `TIN ${activeEbm.tin}`}` : "Add EBM details from your cart before placing this order."}</p>
            </div>
            <Link className="ebm-edit-link" href="/cart">{activeEbm.requested ? "Edit" : "Add request"}</Link>
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
          {error && (
            <div className="review-error" role="alert">
              <span>{error}</span>
              {submissionUncertain && (
                <div className="review-error-actions">
                  <button type="button" onClick={() => void submit(undefined, true)} disabled={submitting}>
                    {submitting ? "Checking order…" : "Retry this order"}
                  </button>
                  <Link href="/customer/orders">Check my orders</Link>
                </div>
              )}
            </div>
          )}
          {actionHint && !submissionUncertain && <p className="review-action-hint" role="status">{actionHint}</p>}
          <button
            className="place-order"
            disabled={!confirmed || (requiresAgeConfirmation && !ageConfirmed) || address.trim().length < 5 || submitting || submissionUncertain}
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
