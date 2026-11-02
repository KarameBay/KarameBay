"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";

export function AddressActions() {
  const cart = useCart();
  const canChooseLocation = cart.hydrated && cart.items.length > 0;

  return (
    <div className="customer-address-actions">
      {canChooseLocation ? (
        <Link href="/checkout/delivery">Add a delivery address</Link>
      ) : (
        <Link href="/stores">Browse stores to add an address</Link>
      )}
      <small>
        {canChooseLocation
          ? "Choose a Kigali location for your current order. You can save it there."
          : "Choose items first, then save your Kigali address during checkout."}
      </small>
    </div>
  );
}
