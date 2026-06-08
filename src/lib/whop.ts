/**
 * Whop API client.
 *
 * Whop doesn't expose a Stripe-style /charges endpoint. The closest primitive
 * for hosted card checkout is to create a one-time, hidden Plan per order via
 * `POST /api/v5/plans`. Whop returns a `purchase_url` we redirect the buyer
 * to; after payment, Whop fires a `payment.succeeded` webhook with the
 * plan's metadata so we can mark the order paid.
 *
 * Required env (all server-only):
 *   WHOP_API_KEY        Bearer token from Whop → Developers → API Keys
 *   WHOP_COMPANY_ID     Business id, e.g. biz_xxxxx
 *   WHOP_WEBHOOK_SECRET HMAC secret from the webhook endpoint config
 *
 * Optional env:
 *   WHOP_API_BASE       Override API base (default https://api.whop.com)
 */

import "server-only";

const DEFAULT_BASE = "https://api.whop.com";

export interface WhopCharge {
  /** Whop's plan id — stored on orders.whop_charge_id for webhook lookup. */
  id: string;
  /** Hosted checkout URL — redirect the customer here. */
  checkout_url: string;
  status: string;
}

export interface CreateChargeInput {
  /** Amount in USD minor units (cents). Converted to dollars for Whop. */
  amountUsdCents: number;
  /** Buyer email. */
  email: string;
  /** Where to send the buyer after a successful charge. */
  successUrl: string;
  /** Where to send the buyer if they cancel out of Whop checkout. */
  cancelUrl: string;
  /** Order metadata so the webhook can look up the right order row. */
  metadata: Record<string, string>;
  /** Public-facing title shown on the Whop checkout page. */
  title: string;
}

function getApiKey(): string {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new Error("WHOP_API_KEY is not set");
  return key;
}

function getCompanyId(): string {
  const id = process.env.WHOP_COMPANY_ID;
  if (!id) throw new Error("WHOP_COMPANY_ID is not set");
  return id;
}

function getBase(): string {
  return process.env.WHOP_API_BASE ?? DEFAULT_BASE;
}

/**
 * Mint a hidden one-time Whop Plan for this order and return its purchase_url.
 *
 * Hidden plans don't appear on the company's public storefront, so the only
 * way for a buyer to land on the checkout is via this URL.
 */
export async function createCharge(input: CreateChargeInput): Promise<WhopCharge> {
  const priceUsd = input.amountUsdCents / 100;

  const res = await fetch(`${getBase()}/api/v5/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      company_id: getCompanyId(),
      plan_type: "one_time",
      initial_price: priceUsd,
      base_currency: "usd",
      visibility: "hidden",
      title: input.title,
      release_method: "buy_now",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Whop createCharge failed: ${res.status} ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    id?: string;
    purchase_url?: string;
    status?: string;
  };
  if (!json.id || !json.purchase_url) {
    throw new Error(
      `Whop createCharge returned unexpected shape: ${JSON.stringify(json).slice(0, 500)}`
    );
  }

  return {
    id: json.id,
    checkout_url: json.purchase_url,
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
