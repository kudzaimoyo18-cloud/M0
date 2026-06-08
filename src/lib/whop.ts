/**
 * Whop API client.
 *
 * v2 of M0 uses Whop for online card payments. We hit the Charges API
 * (POST /api/v5/charges) to mint a hosted checkout URL per order. Customer
 * is redirected to Whop's checkout page, pays by card, Whop posts a webhook
 * to /api/webhooks/whop with `charge.succeeded`. We then flip the order
 * status to 'paid'.
 *
 * Required env (all server-only — never NEXT_PUBLIC_*):
 *   WHOP_API_KEY         Bearer token from Whop dashboard → Developers
 *   WHOP_WEBHOOK_SECRET  HMAC secret from the webhook endpoint config
 *
 * Optional env:
 *   WHOP_API_BASE        Override API base (default https://api.whop.com)
 */

import "server-only";

const DEFAULT_BASE = "https://api.whop.com";

export interface WhopCharge {
  /** Whop's charge ID — stored on orders.whop_charge_id for webhook lookup. */
  id: string;
  /** Hosted checkout URL — redirect the customer here. */
  checkout_url: string;
  status: string;
}

export interface CreateChargeInput {
  /** Amount in USD minor units (cents). Whop expects integer cents. */
  amountUsdCents: number;
  /** Buyer email — Whop pre-fills this on its checkout page. */
  email: string;
  /** Where to send the buyer after a successful charge. */
  successUrl: string;
  /** Where to send the buyer if they cancel out of Whop checkout. */
  cancelUrl: string;
  /** Arbitrary metadata. We pass orderId + reference so the webhook can look up the order. */
  metadata: Record<string, string>;
}

function getApiKey(): string {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new Error("WHOP_API_KEY is not set");
  return key;
}

function getBase(): string {
  return process.env.WHOP_API_BASE ?? DEFAULT_BASE;
}

/**
 * Create a Whop charge and return the hosted checkout URL.
 *
 * If Whop changes the endpoint shape, this is the single place to update —
 * every caller goes through this function.
 */
export async function createCharge(input: CreateChargeInput): Promise<WhopCharge> {
  const res = await fetch(`${getBase()}/api/v5/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount_cents: input.amountUsdCents,
      currency: "usd",
      email: input.email,
      redirect_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Whop createCharge failed: ${res.status} ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as Partial<WhopCharge>;
  if (!json.id || !json.checkout_url) {
    throw new Error(
      `Whop createCharge returned unexpected shape: ${JSON.stringify(json).slice(0, 500)}`
    );
  }

  return {
    id: json.id,
    checkout_url: json.checkout_url,
    status: json.status ?? "pending",
  };
}

/**
 * Verify a Whop webhook signature.
 *
 * Whop signs each webhook with HMAC-SHA256 of the raw request body using the
 * webhook endpoint's signing secret. Signature lives in `x-whop-signature` as
 * lowercase hex. Constant-time compare to avoid timing leaks.
 *
 * Pass the RAW body — JSON.parse/serialize loses byte-equality and the
 * signature won't match.
 */
export async function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const a = signatureHeader.trim().toLowerCase();
  if (a.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
