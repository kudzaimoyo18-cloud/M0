import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { convertFromUsdMinor, getRate, type Currency } from "@/lib/currency";
import { buildWhatsAppUrl, getDestinationDigits } from "@/lib/whatsapp";

const BodySchema = z.object({
  currency: z.enum(["USD", "ZWG"]),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string(),
        slug: z.string(),
        name: z.string(),
        variantLabel: z.string().optional(),
        unitPriceUsdMinor: z.number().int().nonnegative(),
        qty: z.number().int().positive(),
        imageUrl: z.string().optional(),
      })
    )
    .min(1),
  shipping: z.object({
    name: z.string().min(1),
    phone: z.string().min(4),
    email: z.string().email(),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    country: z.string().default("ZW"),
  }),
});

function nextReference(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `M0-${ymd}-${rand}`;
}

function uuid() {
  return crypto.randomUUID();
}

/**
 * Creates a pending COD order and returns a wa.me URL the client should open.
 * No payment processing — settlement happens in person at delivery.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const currency = body.currency as Currency;

  const subtotalUsdMinor = body.lines.reduce((s, l) => s + l.unitPriceUsdMinor * l.qty, 0);
  const subtotalMinor = await convertFromUsdMinor(subtotalUsdMinor, currency);
  const fxRate = await getRate(currency);
  const shippingMinor = subtotalUsdMinor >= 10000 ? 0 : await convertFromUsdMinor(500, currency);
  const totalMinor = subtotalMinor + shippingMinor;

  const orderId = uuid();
  const reference = nextReference();

  const db = await getDb();
  const orderLines = body.lines.map((l) => ({
    id: uuid(),
    orderId,
    productId: l.productId,
    variantId: l.variantId,
    productName: l.name,
    variantLabel: l.variantLabel ?? null,
    qty: l.qty,
    unitPriceMinor: Math.round(l.unitPriceUsdMinor * fxRate),
    lineTotalMinor: Math.round(l.unitPriceUsdMinor * l.qty * fxRate),
  }));

  await db.insert(schema.orders).values({
    id: orderId,
    reference,
    email: body.shipping.email.toLowerCase(),
    currency,
    subtotalMinor,
    shippingMinor,
    totalMinor,
    fxRateFromUsd: fxRate,
    shippingName: body.shipping.name,
    shippingPhone: body.shipping.phone,
    shippingLine1: body.shipping.line1,
    shippingLine2: body.shipping.line2 ?? null,
    shippingCity: body.shipping.city,
    shippingCountry: body.shipping.country,
    paymentProvider: "whatsapp_cod",
    status: "pending",
  });
  await db.insert(schema.orderItems).values(orderLines);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const whatsappUrl = buildWhatsAppUrl({
    reference,
    currency,
    totalMinor,
    shipping: body.shipping,
    lines: orderLines.map((l) => ({
      name: l.productName,
      variantLabel: l.variantLabel,
      qty: l.qty,
      unitPriceMinor: l.unitPriceMinor,
    })),
    siteUrl,
  });

  const persisted = (await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1))[0];
  if (!persisted) {
    return NextResponse.json({ ok: false, error: "Order failed to persist" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    reference,
    orderId,
    redirectUrl: whatsappUrl ?? `${siteUrl}/checkout/thanks?ref=${encodeURIComponent(reference)}`,
    whatsappConfigured: !!getDestinationDigits(),
    thanksUrl: `${siteUrl}/checkout/thanks?ref=${encodeURIComponent(reference)}`,
  });
}
