"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  emailVerifiedAt: string | null;
  orderCount: number;
};

export function AdminCustomerList({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function verify(id: string) {
    setSaving(id); setError("");
    const response = await fetch(`/api/admin/customers/${id}/verification`, { method: "PATCH" });
    const body = await response.json().catch(() => ({})); setSaving(null);
    if (!response.ok) return setError(body.error ?? "Could not verify the customer.");
    setCustomers((current) => current.map((customer) => customer.id === id ? { ...customer, emailVerifiedAt: body.verifiedAt } : customer));
  }
  return (
    <section className="admin-customer-list">
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-scroll"><table><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Verification</th><th>Orders</th><th>Account</th></tr></thead>
        <tbody>{customers.map((customer) => <tr key={customer.id}>
          <td><b>{customer.firstName} {customer.lastName}</b></td><td>{customer.email}</td><td>{customer.phone}</td>
          <td>{customer.emailVerifiedAt ? <span className="verified"><CheckCircle2 /> Verified</span> : <button onClick={() => verify(customer.id)} disabled={saving === customer.id}>{saving === customer.id ? <LoaderCircle className="spin" /> : "Mark verified"}</button>}</td>
          <td>{customer.orderCount}</td><td>{customer.status}</td>
        </tr>)}</tbody></table></div>
    </section>
  );
}
