import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatPrice, type Currency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; email?: string }>;
}) {
  const { ref, email } = await searchParams;

  let order = null as Awaited<ReturnType<typeof loadOrder>>;
  if (ref && email) {
    order = await loadOrder(ref, email);
  }

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 max-w-2xl mx-auto">
      <h1 className="font-display text-section">Track an order</h1>
      <p className="text-ink-500 text-[14px] mt-2 max-w-measure">
        Enter your order reference and the email you used at checkout. We&apos;ll show the current status.
      </p>

      <form method="GET" className="mt-8 space-y-5">
        <label className="block">
          <span className="label block mb-2">Reference</span>
          <input name="ref" defaultValue={ref ?? ""} required placeholder="M0-20260517-1234" className="input-underline tabular" />
        </label>
        <label className="block">
          <span className="label block mb-2">Email</span>
          <input name="email" type="email" defaultValue={email ?? ""} required className="input-underline" />
        </label>
        <button type="submit" className="btn-primary">Look up</button>
      </form>

      {ref && email && !order && (
        <p role="alert" className="mt-8 text-danger text-[14px]">
          No order found for that reference + email combination.
        </p>
      )}

      {order && (
        <OrderSummary order={order.order} items={order.items} />
      )}
    </div>
  );
}

async function loadOrder(reference: string, email: string) {
  try {
    const db = await getDb();
    const found = (await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.reference, reference.trim()), eq(schema.orders.email, email.trim().toLowerCase())))
      .limit(1))[0];
    if (!found) return null;
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, found.id));
    return { order: found, items };
  } catch {
    return null;
  }
}

function OrderSummary({ order, items }: { order: typeof schema.orders.$inferSelect; items: (typeof schema.orderItems.$inferSelect)[] }) {
  const currency = order.currency as Currency;
  return (
    <section className="mt-12 border-t border-ink-300 pt-8">
      <header className="flex items-baseline justify-between">
        <h2 className="font-display text-section">{order.reference}</h2>
        <span className="label capitalize">{order.status}</span>
      </header>
      <p className="text-ink-500 mt-1 text-[14px]">
        {new Date(order.createdAt).toLocaleString()}
      </p>

      <ul className="mt-6 border-t border-ink-300">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between py-3 border-b border-ink-300 text-[14px]">
            <span>
              {i.productName}{i.variantLabel ? ` · ${i.variantLabel}` : ""} × {i.qty}
            </span>
            <span className="tabular">{formatPrice(i.lineTotalMinor, currency)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 max-w-sm ml-auto text-[14px]">
        <Row k="Subtotal" v={formatPrice(order.subtotalMinor, currency)} />
        <Row k="Shipping" v={formatPrice(order.shippingMinor, currency)} />
        <div className="flex justify-between border-t border-ink-900 mt-2 pt-2">
          <span className="label">Total</span>
          <span className="label tabular">{formatPrice(order.totalMinor, currency)}</span>
        </div>
      </div>

      <p className="caption text-ink-500 mt-8">
        Need to make a change? Reply on the WhatsApp thread from your order.
      </p>
      <Link href="/" className="label underline underline-offset-4 mt-4 inline-block">Continue shopping</Link>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1">
      <span>{k}</span>
      <span className="tabular">{v}</span>
    </div>
  );
}
