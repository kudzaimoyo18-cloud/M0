import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { convertFromUsdMinor, getRate, type Currency } from "@/lib/currency";
import { buildWhatsAppUrl, getDestinationDigits } from "@/lib/whatsapp";
import { shippingUsdMinor, subtotalUsdMinor as sumCartUsdMinor } from "@/lib/cart-math";
import { nextReference } from "@/lib/order-reference";

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

function uuid() {
  return crypto.randomUUID();
}

/**
 * Creates a pending order and returns a wa.me URL the client should open.
 * No payment processing — payment is arranged in the WhatsApp thread that
 * opens after submit; delivery follows in 5–7 days.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const currency = body.currency as Currency;

  // Harare-only delivery in v1. Match case-insensitively against common variants.
  const city = body.shipping.city.trim().toLowerCase();
  if (city !== "harare") {
    return NextResponse.json(
      {
        ok: false,
        error: "We currently deliver to Harare only. Message us on WhatsApp from the footer to arrange delivery elsewhere.",
      },
      { status: 422 }
    );
  }

  const subtotalUsdMinor = sumCartUsdMinor(body.lines);
  const subtotalMinor = await convertFromUsdMinor(subtotalUsdMinor, currency);
  const fxRate = await getRate(currency);
  const shippingUsdMinorValue = shippingUsdMinor(subtotalUsdMinor);
  const shippingMinor =
    shippingUsdMinorValue === 0
      ? 0
      : await convertFromUsdMinor(shippingUsdMinorValue, currency);
  const totalMinor = subtotalMinor + shippingMinor;

  const orderId = uuid();
  const reference = nextReference();

  const db = await getDb();
  // Round once per line, then derive the line total from the rounded unit
  // price. If we round unit and line independently, large quantities can
  // cause subtotalMinor and SUM(line_total_minor) to disagree by 1 cent.
  const orderLines = body.lines.map((l) => {
    const unitPriceMinor = Math.round(l.unitPriceUsdMinor * fxRate);
    return {
      id: uuid(),
      orderId,
      productId: l.productId,
      variantId: l.variantId,
      productName: l.name,
      variantLabel: l.variantLabel ?? null,
      qty: l.qty,
      unitPriceMinor,
      lineTotalMinor: unitPriceMinor * l.qty,
    };
  });

  // Wrap the order + items in a single transaction. Otherwise a failure
  // between the two inserts leaves an orphan order row with no line detail
  // — the customer is charged for a phantom order in our records.
  await db.transaction(async (tx) => {
    await tx.insert(schema.orders).values({
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
      paymentProvider: "whatsapp",
      status: "pending",
    });
    await tx.insert(schema.orderItems).values(orderLines);
  });

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
