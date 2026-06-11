/**
 * Order lifecycle for M0.
 *
 * pending    Order placed, payment not yet confirmed
 * paid       Payment confirmed (webhook or admin)
 * preparing  Items being picked/packed in Dubai
 * ready      Packed, waiting on the next Dubai→Harare shipment
 * dispatched In transit to Harare / out for delivery
 * delivered  Customer has the goods
 * cancelled  Cancelled before dispatch
 * failed     Payment failed
 * refunded   Money returned after payment
 *
 * Stored as free text on orders.status — this module is the single source
 * of truth for which values are legal and how they render.
 */

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
  "cancelled",
  "failed",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The forward-progress steps shown on the customer tracking timeline. */
export const TIMELINE_STEPS: { status: OrderStatus; label: string; detail: string }[] = [
  { status: "pending", label: "Order placed", detail: "We received your order." },
  { status: "paid", label: "Payment confirmed", detail: "Payment received — thank you." },
  { status: "preparing", label: "Preparing", detail: "Your items are being picked and packed." },
  { status: "ready", label: "Ready to ship", detail: "Packed and waiting for the next shipment." },
  { status: "dispatched", label: "Dispatched", detail: "On the way to you in Harare." },
  { status: "delivered", label: "Delivered", detail: "Enjoy! Tag @m0 in your fit pics." },
];

/** Index into TIMELINE_STEPS for a given status, -1 if terminal/off-track. */
export function timelineIndex(status: string): number {
  return TIMELINE_STEPS.findIndex((s) => s.status === status);
}

/** True for statuses that stop the timeline (cancelled/failed/refunded). */
export function isTerminalBad(status: string): boolean {
  return status === "cancelled" || status === "failed" || status === "refunded";
}