import Link from "next/link";
import { getDb, schema } from "@/db";
import { desc } from "drizzle-orm";
import { formatPrice } from "@/lib/currency";

export default async function AdminProducts() {
  const db = await getDb();
  const rows = await db.select().from(schema.products).orderBy(desc(schema.products.createdAt));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-section">Products</h2>
        <Link href="/admin/products/new" className="btn-primary">New product</Link>
      </div>
      {rows.length === 0 ? (
        <div className="border border-ink-300 p-10 text-center">
          <p className="text-ink-500">No products yet.</p>
          <Link href="/admin/products/new" className="btn-secondary mt-4">Add the first one</Link>
        </div>
      ) : (
        <table className="w-full text-[14px]">
          <thead className="caption text-ink-500">
            <tr className="border-b border-ink-300">
              <th className="text-left py-3">Name</th>
              <th className="text-left py-3">Status</th>
              <th className="text-left py-3">Slug</th>
              <th className="text-right py-3">Price</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-ink-300">
                <td className="py-3">{p.name}</td>
                <td className="py-3 capitalize">{p.status}</td>
                <td className="py-3 text-ink-500">{p.slug}</td>
                <td className="py-3 text-right tabular">{formatPrice(p.priceUsdMinor, "USD")}</td>
                <td className="py-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="label underline underline-offset-4">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
