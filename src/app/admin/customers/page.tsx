import Link from "next/link";
import { AdminCustomerList } from "@/components/admin/admin-customer-list";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const admin = await requireRole("ADMIN");
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, emailVerifiedAt: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return <><main className="admin-orders-page"><header className="admin-dashboard-header"><div><span className="catalog-kicker">KARAME BAY ADMIN</span><h1>Customers</h1><p>Private customer contact details are visible only to authorized administrators.</p></div><div className="admin-header-actions"><Link href="/admin">Dashboard</Link><Link href="/admin/orders">Orders</Link></div></header>
    <AdminCustomerList initialCustomers={customers.map((customer) => ({ ...customer, emailVerifiedAt: customer.emailVerifiedAt?.toISOString() ?? null, orderCount: customer._count.orders }))} />
  </main><OperationsPortalBadge role={`${admin.firstName} · Admin`} destination="/admin/login" /></>;
}
