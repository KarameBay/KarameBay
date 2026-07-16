"use client";
import { useRouter } from "next/navigation";
export function LogoutButton({
  destination = "/customer/login",
  role,
}: {
  destination?: string;
  role?: "CUSTOMER" | "ADMIN" | "RIDER";
}) {
  const router = useRouter();
  const sessionRole =
    role ??
    (destination.startsWith("/rider")
      ? "RIDER"
      : destination.startsWith("/admin")
        ? "ADMIN"
        : "CUSTOMER");
  return (
    <button
      className="logout-button"
      onClick={async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: sessionRole }),
        });
        router.replace(destination);
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
