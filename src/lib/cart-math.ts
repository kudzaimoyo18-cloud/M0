/**
 * Pure cart-math helpers. Used by both the client-side cart provider and the
 * server-side checkout route so the totals agree across the boundary.
 *
 * All amounts in USD minor units (cents). Currency conversion happens
 * elsewhere (`lib/currency.ts`).
 */

export interface CartLineMath {
  variantId: string;
  unitPriceUsdMinor: number;
  qty: number;
}

/** Free shipping threshold — orders over USD 100. */
export const FREE_SHIPPING_THRESHOLD_USD_MINOR = 10000;

/** Flat shipping fee in USD minor units, applied when subtotal is below the threshold. */
export const FLAT_SHIPPING_USD_MINOR = 500;

/** Total quantity across all lines. */
export function lineCount(lines: ReadonlyArray<{ qty: number }>): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

/** Sum of (unit price × qty) across all lines, in USD minor units. */
export function subtotalUsdMinor(
  lines: ReadonlyArray<CartLineMath>,
): number {
  return lines.reduce((sum, l) => sum + l.unitPriceUsdMinor * l.qty, 0);
}

/**
 * Returns the shipping fee in USD minor units. Zero when the subtotal meets
 * or exceeds the free-shipping threshold; flat fee otherwise.
 */
export function shippingUsdMinor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD_USD_MINOR
    ? 0
    : FLAT_SHIPPING_USD_MINOR;
}

/** True when the subtotal qualifies for free shipping. */
export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD_USD_MINOR;
}

// ── Pure reducers for the cart-provider state machine ──────────────────────
//
// Extracted so they can be exercised directly without rendering the
// CartProvider. The provider wires them into useState.

/**
 * Add a line to the cart. If a line with the same `variantId` already
 * exists, increment its qty; otherwise append the new line.
 */
export function addLine<T extends CartLineMath>(
  lines: ReadonlyArray<T>,
  incoming: T,
): T[] {
  const idx = lines.findIndex((l) => l.variantId === incoming.variantId);
  if (idx === -1) return [...lines, incoming];
  const next = [...lines];
  next[idx] = { ...next[idx], qty: next[idx].qty + incoming.qty };
  return next;
}

/** Remove a line by variantId. */
export function removeLine<T extends CartLineMath>(
  lines: ReadonlyArray<T>,
  variantId: string,
): T[] {
  return lines.filter((l) => l.variantId !== variantId);
}

/**
 * Set the quantity for a line. Lines that end up with qty ≤ 0 are dropped
 * (so the UI can use this for "remove via input").
 */
export function setLineQty<T extends CartLineMath>(
  lines: ReadonlyArray<T>,
  variantId: string,
  qty: number,
): T[] {
  return lines
    .map((l) => (l.variantId === variantId ? { ...l, qty } : l))
    .filter((l) => l.qty > 0);
}
