"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/providers/cart-provider";
import { Price } from "@/components/site/price";

export default function CartPage() {
  const { lines, setQty, remove, subtotalUsdMinor, count } = useCart();

  if (count === 0) {
    return (
      <div className="px-4 md:px-8 py-section min-h-[60svh]">
        <h1 className="font-display text-section">Bag</h1>
        <p className="mt-8 text-ink-500">Your bag is empty.</p>
        <Link href="/women" className="btn-secondary mt-8">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10 lg:gap-16">
      <div>
        <h1 className="font-display text-section mb-8">Bag</h1>
        <ul className="border-t border-ink-300">
          {lines.map((l) => (
            <li key={l.variantId} className="grid grid-cols-[80px_1fr_auto] gap-4 py-6 border-b border-ink-300 items-start">
              <Link href={`/product/${l.slug}`} className="block relative aspect-product bg-ink-100">
                {l.imageUrl && <Image src={l.imageUrl} alt={l.name} fill sizes="80px" className="object-cover" />}
              </Link>
              <div className="min-w-0">
                <Link href={`/product/${l.slug}`} className="text-[14px] hover:opacity-70">
                  {l.name}
                </Link>
                {l.variantLabel && <div className="caption text-ink-500 mt-1">Size {l.variantLabel}</div>}
                <div className="mt-3 flex items-center gap-2">
                  <button aria-label="Decrease quantity" onClick={() => setQty(l.variantId, l.qty - 1)} className="w-8 h-8 border border-ink-300 hover:border-ink-900">−</button>
                  <span className="label tabular w-6 text-center">{l.qty}</span>
                  <button aria-label="Increase quantity" onClick={() => setQty(l.variantId, l.qty + 1)} className="w-8 h-8 border border-ink-300 hover:border-ink-900">+</button>
                  <button onClick={() => remove(l.variantId)} className="ml-4 label underline underline-offset-4">Remove</button>
                </div>
              </div>
              <Price usdMinor={l.unitPriceUsdMinor * l.qty} className="text-[14px] text-right" />
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-[88px] self-start border border-ink-300 p-6">
        <h2 className="label mb-6">Summary</h2>
        <div className="flex justify-between mb-3 text-[14px]">
          <span>Subtotal</span>
          <Price usdMinor={subtotalUsdMinor} />
        </div>
        <div className="flex justify-between mb-3 text-[14px] text-ink-500">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
        <div className="flex justify-between border-t border-ink-300 mt-4 pt-4 text-[14px]">
          <span className="label">Total</span>
          <Price usdMinor={subtotalUsdMinor} className="label" />
        </div>
        <Link href="/checkout" className="btn-primary mt-6">Checkout</Link>
      </aside>
    </div>
  );
}
