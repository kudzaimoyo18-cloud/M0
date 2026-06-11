import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { convertFromUsdMinor, getRate, type Currency } from "@/lib/currency";
import { shippingUsdMinor, subtotalUsdMinor as sumCartUsdMinor } from "@/lib/cart-math";
import { nextReference } from "@/lib/order-reference";
import { createCharge } from "@/lib/whop";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const PaymentMethodSchema = z.enum(["whop", "ecocash", "whatsapp"]);
type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

const BodySchema = z.object({
  paymentMethod: PaymentMethodSchema,
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
 * v3 checkout - three payment methods.
 *
 *   whop    Hosted card checkout via Whop. Buyer redirected, webhook flips
 *           order to 'paid' on charge.succeeded.
 *   ecocash UI stub. Order created with provider='ecocash_pending', buyer
 *           opens WhatsApp to coordinate (Paynow integration TBD).
 *   whatsapp Order via WhatsApp. Order created with provider='whatsapp',
 *           buyer opens WhatsApp with prefilled summary; payment is arranged
 *           on the thread BEFORE dispatch. No cash on delivery.
 *
 * No transaction wrapper - neon-http doesn't support db.transaction.
 * Sequential inserts: if items insert fails, the order row stays as 'pending'
 * with no items and can be cleaned up by admin.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const currency = body.currency as Currency;
  const method = body.paymentMethod;

  // Harare-only delivery still enforced.
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
  // Whop bills in USD cents regardless of display currency.
  const totalUsdCents = subtotalUsdMinor + shippingUsdMinorValue;

  const orderId = uuid();
  const reference = nextReference();
  const db = await getDb();

  // Round per-line first, then derive line totals so subtotal reconciles.
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

  const paymentProvider = providerForMethod(method);

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
    paymentProvider,
    status: "pending",
  });
  await db.insert(schema.orderItems).values(orderLines);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const thanksUrl = `${siteUrl}/checkout/thanks?ref=${encodeURIComponent(reference)}`;

  // -- Branch by payment method ------------------------------------
  if (method === "whop") {
    let charge;
    try {
      charge = await createCharge({
        amountUsdCents: totalUsdCents,
        email: body.shipping.email.toLowerCase(),
        successUrl: thanksUrl,
        cancelUrl: `${siteUrl}/checkout?cancelled=1`,
        title: `M0 Order ${reference}`,
        metadata: { orderId, reference },
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

    await db
      .update(schema.orders)
      .set({ whopChargeId: charge.id })
      .where(eq(schema.orders.id, orderId));

    return NextResponse.json({
      ok: true,
      method,
      reference,
      orderId,
      redirectUrl: charge.checkout_url,
      thanksUrl,
    });
  }

  // EcoCash + Cash both route through WhatsApp - they differ only in the
  // prefilled message and the comingSoon flag the UI shows for EcoCash.
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
    paymentMethod: method,
  });

  return NextResponse.json({
    ok: true,
    method,
    reference,
    orderId,
    redirectUrl: whatsappUrl ?? thanksUrl,
    thanksUrl,
    whatsapp: true,
    comingSoon: method === "ecocash",
  });
}

function providerForMethod(method: PaymentMethod): string {
  switch (method) {
    case "whop":
      return "whop";
    case "ecocash":
      return "ecocash_pending";
    case "whatsapp":
      return "whatsapp";
  }
}
