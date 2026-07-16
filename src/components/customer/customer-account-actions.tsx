"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function CustomerAccountActions() {
  const cart = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    const clearCart = window.confirm(
      "Clear your cart before signing out? Click Cancel to keep it for next time.",
    );
    if (clearCart) cart.clear();

    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "CUSTOMER" }),
      });
      router.replace("/customer/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="customer-account-logout" onClick={signOut} disabled={busy}>
      <LogOut />
      {busy ? "Signing out..." : "Logout"}
    </button>
  );
}
