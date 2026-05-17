import { getDb, schema } from "@/db";
import { count, eq, desc } from "drizzle-orm";
import Link from "next/link";
import { formatPrice, type Currency } from "@/lib/currency";

export default async function AdminDashboard() {
  const db = await getDb();
  const [productsCount] = await db
    .select({ n: count() })
    .from(schema.products)
    .where(eq(schema.products.status, "active"));
  const [ordersCount] = await db.select({ n: count() }).from(schema.orders);
  const [pendingCount] = await db
    .select({ n: count() })
    .from(schema.orders)
    .where(eq(schema.orders.status, "pending"));

  const recent = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(8);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink-300 border border-ink-300">
        <Stat label="Active products" value={productsCount?.n ?? 0} href="/admin/products" />
        <Stat label="Total orders" value={ordersCount?.n ?? 0} href="/admin/orders" />
        <Stat label="Pending orders" value={pendingCount?.n ?? 0} href="/admin/orders?status=pending" />
      </div>

      <h2 className="font-display text-section mt-12 mb-4">Recent orders</h2>
      {recent.length === 0 ? (
        <p className="text-ink-500">No orders yet.</p>
      ) : (
        <table className="w-full text-[14px]">
          <thead className="caption text-ink-500">
            <tr className="border-b border-ink-300">
              <th className="text-left py-3">Reference</th>
              <th className="text-left py-3">Date</th>
              <th className="text-left py-3">Customer</th>
              <th className="text-left py-3">Status</th>
              <th className="text-right py-3">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id} className="border-b border-ink-300">
                <td className="py-3 tabular">{o.reference}</td>
                <td className="py-3">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="py-3">{o.email}</td>
                <td className="py-3 capitalize">{o.status}</td>
                <td className="py-3 text-right tabular">{formatPrice(o.totalMinor, o.currency as Currency)}</td>
                <td className="py-3 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="label underline underline-offset-4">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="bg-paper p-6 hover:bg-ink-100 transition-colors duration-fast">
      <div className="caption text-ink-500">{label}</div>
      <div className="font-display text-display mt-2 tabular leading-none">{value}</div>
    </Link>
  );
}
