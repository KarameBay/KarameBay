"use client";

import { useState } from "react";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import type { CartProduct } from "@/lib/cart-types";
import { useCart } from "@/components/cart/cart-provider";

export function AddToCart({ product, disabled = false }: { product: CartProduct; disabled?: boolean }) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  function showAdded() {
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  function add() {
    if (!cart.hydrated) return;
    const result = cart.addItem(product);
    if (!result.ok) {
      setConflict(result.conflictStoreName);
      return;
    }
    showAdded();
  }

  function replaceCart() {
    cart.replaceWith(product);
    setConflict(null);
    showAdded();
  }

  return (
    <>
      <button className={`catalog-add ${added ? "added" : ""}`} type="button" onClick={add} disabled={disabled || !cart.hydrated}>
        {disabled ? "Unavailable" : !cart.hydrated ? "Loading basket…" : added ? <><Check /> Added</> : <><Plus /> Add</>}
      </button>
      {conflict && (
        <div className="cart-warning-backdrop">
          <div className="cart-warning" role="dialog" aria-modal="true" aria-labelledby="cart-warning-title">
            <button className="cart-warning-close" type="button" onClick={() => setConflict(null)} aria-label="Close"><X /></button>
            <span><AlertTriangle /></span>
            <h3 id="cart-warning-title">Start a new cart?</h3>
            <p>Your cart contains items from <b>{conflict}</b>. Karame Bay currently supports one store per checkout.</p>
            <div>
              <button type="button" onClick={() => setConflict(null)}>Keep my cart</button>
              <button type="button" onClick={replaceCart}>Clear cart and add</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
