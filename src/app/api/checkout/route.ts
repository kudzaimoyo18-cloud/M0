import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { convertFromUsdMinor, getRate, type Currency } from "@/lib/currency";
import { shippingUsdMinor, subtotalUsdMinor as sumCartUsdMinor } from "@/lib/cart-math";
import { nextReference } from "@/lib/order-reference";
import { createCharge } from "@/lib/whop";

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
 * v2 checkout: persist a pending order, mint a Whop charge, return the Whop
 * hosted checkout URL the client should redirect to. The Whop webhook
 * (POST /api/webhooks/whop) flips status → 'paid' on `charge.succeeded`.
 *
 * No transaction wrapper — neon-http doesn't support db.transaction.
 * Sequential inserts: if the order row lands but order_items fail, the order
 * stays in 'pending' with no items and can be cleaned up by the admin.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const currency = body.currency as Currency;

  // Harare-only delivery in v2 still. Match case-insensitively.
  const city = body.shipping.city.trim().toLowerCase();
  if (city !== "harare") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "We currently deliver to Harare only. Message us on WhatsApp from the footer to arrange delivery elsewhere.",
      },
      { status: 422 }
    );
  }

  const subtotalUsdMinor = sumCartUsdMinor(body.lines);
  const subtotalMinor = await convertFromUsdMinor(subtotalUsdMinor, currency);
  const fxRate = await getRate(currency);
  const shippingUsdMinorValue = shippingUsdMinor(subtotalUsdMinor);
  const shippingMinor =
    shippingUsdMinorValue === 0 ? 0 : await convertFromUsdMinor(shippingUsdMinorValue, currency);
  const totalMinor = subtotalMinor + shippingMinor;
  // Whop is billed in USD cents regardless of the display currency. We charge
  // the USD-canonical total, not the converted one.
  const totalUsdCents = subtotalUsdMinor + shippingUsdMinorValue;

  const orderId = uuid();
  const reference = nextReference();
  const db = await getDb();

  // Round per-line, then derive line totals so subtotals reconcile exactly.
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
    paymentProvider: "whop",
    status: "pending",
  });
  await db.insert(schema.orderItems).values(orderLines);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  // Mint the Whop charge. If this throws, the order row stays in 'pending'
  // with no charge id — admin can either retry the checkout or cancel it.
  let charge;
  try {
    charge = await createCharge({
      amountUsdCents: totalUsdCents,
      email: body.shipping.email.toLowerCase(),
      successUrl: `${siteUrl}/checkout/thanks?ref=${encodeURIComponent(reference)}`,
      cancelUrl: `${siteUrl}/checkout?cancelled=1`,
      title: `M0 Order ${reference}`,
      metadata: {
        orderId,
        reference,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not start card payment. Try again or contact us on WhatsApp.",
      },
      { status: 502 }
    );
  }

  // Stash the Whop charge id for the webhook to look up.
  await db
    .update(schema.orders)
    .set({ whopChargeId: charge.id })
    .where(eq(schema.orders.id, orderId));

  return NextResponse.json({
    ok: true,
    reference,
    orderId,
    redirectUrl: charge.checkout_url,
    thanksUrl: `${siteUrl}/checkout/thanks?ref=${encodeURIComponent(reference)}`,
  });
}
