import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { getDb } from "@/db";

/**
 * One-shot DDL runner for migration 0002 (Whop payments).
 *
 *   POST /api/admin/migrate-whop
 *
 * Admin-cookie gated. Adds orders.whop_charge_id + index, bumps the
 * payment_provider default to 'whop'. Idempotent — IF NOT EXISTS on every
 * statement so re-runs are safe.
 *
 * Use this until we wire drizzle-kit push into the deploy. After 0002 is
 * applied in prod, this route can be deleted.
 */

const NO_STORE = "private, no-store, no-cache, must-revalidate";

async function run() {
  const db = await getDb();
  // Each statement separately — neon-http rejects multi-statement strings.
  await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS whop_charge_id text`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS orders_whop_charge_idx ON orders (whop_charge_id)`);
  await db.execute(sql`ALTER TABLE orders ALTER COLUMN payment_provider SET DEFAULT 'whop'`);
}

export async function POST() {
  if (!(await isAdmin())) {
    const res = NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }
  try {
    await run();
    const res = NextResponse.json({ ok: true, applied: "0002_whop_payments" });
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "migration failed" },
      { status: 500 }
    );
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }
}

export function GET(_req: NextRequest) {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": NO_STORE },
  });
}
