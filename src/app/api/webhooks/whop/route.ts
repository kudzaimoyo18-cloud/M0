import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { verifyWebhook } from "@/lib/whop";

/**
 * Whop webhook receiver.
 *
 *   POST /api/webhooks/whop
 *
 * Whop posts every payment lifecycle event here. We verify the HMAC sig
 * against WHOP_WEBHOOK_SECRET, then flip the matching order's status:
 *
 *   charge.succeeded / payment.success → status='paid', paid_at=now()
 *   charge.failed / payment.failed     → status='failed'
 *
 * Always returns 200 once the signature is valid — Whop retries 4xx/5xx
 * indefinitely. If the order doesn't exist (stale event, replay) we 200
 * silently rather than block the retry queue.
 *
 * Raw body is required for signature verification — we read req.text()
 * and JSON.parse separately. Don't call req.json() (consumes the stream).
 */

const NO_STORE = "private, no-store, no-cache, must-revalidate";

const SUCCESS_EVENTS = new Set([
  "payment.success",
  "payment.succeeded",
  "charge.succeeded",
  "membership.went_valid",
]);

const FAIL_EVENTS = new Set([
  "payment.failed",
  "charge.failed",
]);

interface WhopEvent {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    metadata?: Record<string, string>;
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-whop-signature");

  const ok = await verifyWebhook(rawBody, sig);
  if (!ok) {
    const res = NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }

  let event: WhopEvent;
  try {
    event = JSON.parse(rawBody) as WhopEvent;
  } catch {
    const res = NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }

  const type = event.type ?? "";
  const chargeId = event.data?.id;
  const metaOrderId = event.data?.metadata?.orderId;

  // Look up the order. Prefer metadata.orderId (set when we minted the
  // charge), fall back to whopChargeId match. Either may identify the row.
  const db = await getDb();
  let order: typeof schema.orders.$inferSelect | undefined;

  if (metaOrderId) {
    order = (await db.select().from(schema.orders).where(eq(schema.orders.id, metaOrderId)).limit(1))[0];
  }
  if (!order && chargeId) {
    order = (
      await db.select().from(schema.orders).where(eq(schema.orders.whopChargeId, chargeId)).limit(1)
    )[0];
  }

  if (!order) {
    // No order — 200 so Whop stops retrying. Could be a test event or replay.
    const res = NextResponse.json({ ok: true, note: "no matching order" });
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }

  if (SUCCESS_EVENTS.has(type)) {
    await db
      .update(schema.orders)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(schema.orders.id, order.id));
  } else if (FAIL_EVENTS.has(type)) {
    await db
      .update(schema.orders)
      .set({ status: "failed" })
      .where(eq(schema.orders.id, order.id));
  }
  // Other event types (refund, dispute, etc.) we acknowledge but don't act on
  // yet. Add handlers as needed.

  const res = NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", NO_STORE);
  return res;
}

export function GET() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": NO_STORE },
  });
}
