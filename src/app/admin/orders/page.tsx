import Link from "next/link";
import { getDb, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { formatPrice, type Currency } from "@/lib/currency";

const STATUSES = ["all", "pending", "paid", "cancelled", "failed", "refunded"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: Status }>;
}) {
  const sp = await searchParams;
  const status: Status = STATUSES.includes(sp.status ?? "all") ? (sp.status ?? "all") : "all";
  const db = await getDb();
  const query = db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(100);
  const rows = status === "all" ? await query : await db.select().from(schema.orders).where(eq(schema.orders.status, status)).orderBy(desc(schema.orders.createdAt)).limit(100);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-section">Orders</h2>
        <nav className="flex gap-4 label">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/orders${s === "all" ? "" : `?status=${s}`}`}
              className={status === s ? "underline underline-offset-4" : "opacity-60 hover:opacity-100"}
            >
              {s}
            </Link>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
        <p className="text-ink-500">Nothing here.</p>
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
            {rows.map((o) => (
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
