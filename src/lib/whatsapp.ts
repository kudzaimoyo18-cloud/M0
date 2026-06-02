/**
 * WhatsApp checkout helper.
 *
 * v1 of M0 doesn't take card or mobile-money payments online — every order is
 * confirmed in the WhatsApp thread that opens at checkout, and payment is
 * coordinated there before dispatch. Delivery lands in 5–7 days from
 * confirmation. This module builds the wa.me deep link and the prefilled
 * order message.
 *
 * The destination number lives in NEXT_PUBLIC_WHATSAPP_NUMBER so it's safe to
 * read in client components.
 */

export interface WhatsAppOrderInput {
  reference: string;
  currency: string;
  totalMinor: number;
  shipping: {
    name: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    country: string;
  };
  lines: {
    name: string;
    variantLabel?: string | null;
    qty: number;
    unitPriceMinor: number;
  }[];
  siteUrl?: string;
}

function formatAmount(minor: number, currency: string): string {
  const value = (minor / 100).toFixed(2);
  return `${currency} ${value}`;
}

/** Get the configured M0 WhatsApp destination, digits only. */
export function getDestinationDigits(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  return raw.replace(/[^\d]/g, "");
}

/** Pretty version with a leading +, for display in the UI. */
export function getDisplayNumber(): string {
  const digits = getDestinationDigits();
  return digits ? `+${digits}` : "";
}

/** Build the prefilled message body customers send when they tap "Order via WhatsApp". */
export function buildOrderMessage(input: WhatsAppOrderInput): string {
  const lines: string[] = [];
  lines.push(`*M0 — Order ${input.reference}*`);
  lines.push("");
  lines.push("*Items*");
  for (const item of input.lines) {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
    lines.push(`• ${item.name}${variant} × ${item.qty} — ${formatAmount(item.unitPriceMinor * item.qty, input.currency)}`);
  }
  lines.push("");
  lines.push(`*Total* ${formatAmount(input.totalMinor, input.currency)}`);
  lines.push("_Payment arranged on this thread. Delivery 5–7 days from confirmation._");
  lines.push("");
  lines.push("*Ship to*");
  lines.push(input.shipping.name);
  lines.push(input.shipping.line1);
  if (input.shipping.line2) lines.push(input.shipping.line2);
  lines.push(`${input.shipping.city}, ${input.shipping.country}`);
  lines.push(input.shipping.phone);
  if (input.siteUrl) {
    lines.push("");
    lines.push(`Order ref: ${input.siteUrl}/account`);
  }
  return lines.join("\n");
}

export function buildWhatsAppUrl(input: WhatsAppOrderInput): string | null {
  const digits = getDestinationDigits();
  if (!digits) return null;
  const text = encodeURIComponent(buildOrderMessage(input));
  return `https://wa.me/${digits}?text=${text}`;
}
