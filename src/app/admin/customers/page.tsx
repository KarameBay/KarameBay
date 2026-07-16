import Link from "next/link";
import { AdminCustomerList } from "@/components/admin/admin-customer-list";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireRole("ADMIN");
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where = { role: "CUSTOMER", status: { not: "ARCHIVED" } } as const;
  const [customers, total] = await Promise.all([
    db.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, emailVerifiedAt: true, _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <><main className="admin-orders-page"><header className="admin-dashboard-header"><div><span className="catalog-kicker">KARAME BAY ADMIN</span><h1>Customers</h1><p>Private customer contact details are visible only to authorized administrators.</p></div><div className="admin-header-actions"><Link href="/admin">Dashboard</Link><Link href="/admin/orders">Orders</Link></div></header>
    <AdminCustomerList initialCustomers={customers.map((customer) => ({ ...customer, emailVerifiedAt: customer.emailVerifiedAt?.toISOString() ?? null, orderCount: customer._count.orders }))} />
    <nav className="catalog-pages" aria-label="Customer pages">
      <Link href={`/admin/customers?page=${Math.max(1, page - 1)}`} aria-disabled={page <= 1}>Previous</Link>
      <span>Page {page} of {pages}</span>
      <Link href={`/admin/customers?page=${Math.min(pages, page + 1)}`} aria-disabled={page >= pages}>Next</Link>
    </nav>
  </main><OperationsPortalBadge role={`${admin.firstName} · Admin`} destination="/admin/login" /></>;
}
