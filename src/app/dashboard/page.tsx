import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { roleLandingPath } from "@/lib/auth/constants";

export default async function Dashboard() {
  const user = await getCurrentUser("CUSTOMER");
  if (!user) redirect("/customer/login");
  if (user.role !== "CUSTOMER") redirect(roleLandingPath(user.role as "ADMIN" | "RIDER"));
  return (
    <main className="role-page">
      <span className="kicker">AUTHENTICATION COMPLETE</span>
      <h1>Welcome, {user.firstName}</h1>
      <p>
        You are signed in as <b>{user.role.replace("_", " ")}</b>. Continue to
        the protected role area to confirm authorization.
      </p>
      <div className="role-actions">
        <Link href="/customer/account">Open customer account</Link>
        <LogoutButton />
      </div>
    </main>
  );
}
