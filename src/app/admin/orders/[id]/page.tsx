import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { formatPrice, type Currency } from "@/lib/currency";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const order = (await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1))[0];
  if (!order) notFound();
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
  const currency = order.currency as Currency;

  async function setStatus(formData: FormData) {
    "use server";
    await requireAdmin();
    const db = await getDb();
    const next = String(formData.get("status")) as OrderStatus;
    if (!ORDER_STATUSES.includes(next)) return;
    await db
      .update(schema.orders)
      .set({ status: next, paidAt: next === "paid" && !order.paidAt ? new Date() : order.paidAt })
      .where(eq(schema.orders.id, id));
    redirect(`/admin/orders/${id}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12">
      <div>
        <h2 className="font-display text-section">{order.reference}</h2>
        <p className="text-ink-500 mt-1 text-[14px]">{new Date(order.createdAt).toLocaleString()}</p>
        <p className="caption text-ink-500 mt-1">Payment: {order.paymentProvider}</p>

        <h3 className="label mt-8 mb-4">Items</h3>
        <ul className="border-t border-ink-300">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-3 border-b border-ink-300 text-[14px]">
              <span>{i.productName}{i.variantLabel && <span className="text-ink-500"> · {i.variantLabel}</span>} × {i.qty}</span>
              <span className="tabular">{formatPrice(i.lineTotalMinor, currency)}</span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="space-y-8">
        <section>
          <h3 className="label mb-4">Status</h3>
          <form action={setStatus} className="flex items-end gap-3">
            <select name="status" defaultValue={order.status} className="input-underline bg-paper">
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="submit" className="btn-secondary">Update</button>
          </form>
          <p className="caption text-ink-500 mt-3">
            Customer sees this on the tracking page immediately.
          </p>
        </section>

        <section>
          <h3 className="label mb-4">Totals ({currency})</h3>
          <div className="space-y-1 text-[14px]">
            <Row k="Subtotal" v={formatPrice(order.subtotalMinor, currency)} />
            <Row k="Shipping" v={formatPrice(order.shippingMinor, currency)} />
            <Row k="Total" v={formatPrice(order.totalMinor, currency)} bold />
            <p className="caption text-ink-500 mt-2 tabular">FX rate captured: {order.fxRateFromUsd}</p>
          </div>
        </section>

        <section>
          <h3 className="label mb-4">Ship to</h3>
          <address className="not-italic text-[14px]">
            {order.shippingName}<br />
            {order.shippingLine1}<br />
            {order.shippingLine2 && <>{order.shippingLine2}<br /></>}
            {order.shippingCity}, {order.shippingCountry}<br />
            {order.shippingPhone}<br />
            {order.email}
          </address>
        </section>
      </aside>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "label" : ""}>{k}</span>
      <span className={`tabular ${bold ? "label" : ""}`}>{v}</span>
    </div>
  );
}