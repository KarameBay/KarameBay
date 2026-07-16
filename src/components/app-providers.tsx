"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { CartProvider } from "@/components/cart/cart-provider";

const STAFF_PATHS = ["/admin", "/rider", "/dashboard/admin", "/dashboard/rider", "/admin/login", "/rider/login"];

function isStaffPath(pathname: string) {
  return STAFF_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  if (isStaffPath(pathname)) {
    return <>{children}</>;
  }

  return <CartProvider>{children}</CartProvider>;
}
