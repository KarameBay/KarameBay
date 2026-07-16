import Link from "next/link";

export default function Page() {
  return (
    <main className="role-page">
      <span className="kicker">ACCESS DENIED</span>
      <h1>This area belongs to another role.</h1>
      <p>
        Your account is valid, but it does not have permission to open this
        page.
      </p>
      <div className="role-actions">
        <Link href="/">Return to Karame Bay</Link>
      </div>
    </main>
  );
}
