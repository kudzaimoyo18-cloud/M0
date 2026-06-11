"use client";

import { useState, useTransition } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { Price } from "@/components/site/price";
import { getDisplayNumber } from "@/lib/whatsapp";

type PaymentMethod = "whop" | "ecocash" | "cash";

const METHODS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "cash", label: "Cash on Delivery", hint: "Pay the courier when your order arrives. Confirmed on WhatsApp." },
  { id: "whop", label: "Card", hint: "Visa / Mastercard via Whop secure checkout." },
  { id: "ecocash", label: "EcoCash", hint: "Coming soon — we will arrange it on WhatsApp for now." },
];

export default function CheckoutPage() {
  const { lines, subtotalUsdMinor, count, clear } = useCart();
  const { currency } = useCurrency();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");

  if (count === 0) {
    return (
      <div className="px-4 md:px-8 py-section">
        <h1 className="font-display text-section">Checkout</h1>
        <p className="mt-6 text-ink-500">Your bag is empty.</p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      paymentMethod: method,
      currency,
      lines,
      shipping: {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        line1: String(form.get("line1") ?? ""),
        line2: String(form.get("line2") ?? ""),
        city: String(form.get("city") ?? ""),
        country: String(form.get("country") ?? "ZW"),
      },
    };
    startTransition(async () => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        redirectUrl?: string;
        thanksUrl?: string;
        whatsapp?: boolean;
        error?: string;
      };
      if (!json.ok || !json.redirectUrl) {
        setError(json.error ?? "Could not place the order");
        return;
      }
      clear();
      if (json.whatsapp && json.thanksUrl) {
        // WhatsApp flows: open the chat in a new tab, keep M0 thanks page here.
        window.open(json.redirectUrl, "_blank", "noopener,noreferrer");
        window.location.href = json.thanksUrl;
      } else {
        // Card flow: same-tab redirect so bank 3DS challenges work.
        window.location.href = json.redirectUrl;
      }
    });
  }

  const submitLabel =
    method === "whop" ? "Pay with card" : method === "ecocash" ? "Order via EcoCash" : "Order — Cash on Delivery";

  const whatsappNumber = getDisplayNumber();

  return (
    <form onSubmit={onSubmit} className="px-4 md:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16">
      <div>
        <h1 className="font-display text-section mb-2">Checkout</h1>
        <p className="text-ink-500 text-[14px] max-w-measure">
          Delivery to Harare lands in 5–7 days from confirmation.
        </p>

        <fieldset className="space-y-5 mt-10">
          <legend className="label mb-4">Contact</legend>
          <Field name="email" label="Email" type="email" required autoComplete="email" />
          <Field name="phone" label="Phone (WhatsApp preferred)" type="tel" required autoComplete="tel" placeholder="+263 ..." />
        </fieldset>

        <fieldset className="space-y-5 mt-10">
          <legend className="label mb-4">Delivery</legend>
          <p className="caption text-ink-500 -mt-2">
            We currently deliver to Harare only. Outside Harare? Message us on WhatsApp from the footer.
          </p>
          <Field name="name" label="Full name" required autoComplete="name" />
          <Field name="line1" label="Address" required autoComplete="address-line1" />
          <Field name="line2" label="Address (cont.)" autoComplete="address-line2" />
          <div className="grid grid-cols-2 gap-4">
            <Field name="city" label="City" required autoComplete="address-level2" defaultValue="Harare" />
            <Field name="country" label="Country" defaultValue="ZW" required />
          </div>
        </fieldset>

        <fieldset className="mt-10">
          <legend className="label mb-4">Payment</legend>
          <div className="space-y-px border border-ink-300">
            {METHODS.map((m) => (
              <label
                key={m.id}
                className={
                  "flex items-start gap-4 p-4 cursor-pointer transition-colors duration-fast " +
                  (method === m.id ? "bg-ink-900 text-paper" : "bg-paper hover:bg-ink-100")
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                  className="mt-1 accent-current"
                />
                <span className="flex-1">
                  <span className="label block">{m.label}</span>
                  <span className={"text-[13px] block mt-1 " + (method === m.id ? "text-paper/70" : "text-ink-500")}>
                    {m.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {method === "cash" && whatsappNumber && (
            <p className="caption text-ink-500 mt-3">
              Orders are confirmed on WhatsApp {whatsappNumber} before dispatch.
            </p>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="mt-6 text-danger text-[14px]">{error}</p>
        )}
      </div>

      <aside className="lg:sticky lg:top-[88px] self-start border border-ink-300 p-6">
        <h2 className="label mb-6">Summary</h2>
        <ul className="border-t border-ink-300 mb-4">
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between py-3 border-b border-ink-300 text-[13px]">
              <span className="truncate pr-2">
                {l.name}{l.variantLabel ? ` · ${l.variantLabel}` : ""} × {l.qty}
              </span>
              <Price usdMinor={l.unitPriceUsdMinor * l.qty} />
            </li>
          ))}
        </ul>
        <div className="flex justify-between mb-2 text-[14px]">
          <span>Subtotal</span>
          <Price usdMinor={subtotalUsdMinor} />
        </div>
        <div className="flex justify-between mb-2 text-[14px] text-ink-500">
          <span>Shipping</span>
          <span>Free over $100</span>
        </div>
        <div className="flex justify-between border-t border-ink-900 mt-4 pt-3">
          <span className="label">Total ({currency})</span>
          <Price usdMinor={subtotalUsdMinor} className="label" />
        </div>
        <p className="caption text-ink-500 mt-3">
          {method === "whop"
            ? "You will be redirected to Whop secure checkout. No card data touches M0."
            : "We will open WhatsApp with your order summary to confirm payment and delivery."}
        </p>
        <button type="submit" disabled={pending} className="btn-primary mt-6">
          {pending ? "…" : submitLabel}
        </button>
      </aside>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="label block mb-2">{label}{required && <span aria-hidden> *</span>}</span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="input-underline"
      />
    </label>
  );
}