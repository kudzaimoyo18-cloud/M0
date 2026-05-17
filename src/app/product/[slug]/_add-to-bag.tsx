"use client";

import { useState } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/utils";

interface Variant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  inventory: number;
}

export function AddToBag({
  product,
  variants,
}: {
  product: { id: string; slug: string; name: string; priceUsdMinor: number; imageUrl?: string };
  variants: Variant[];
}) {
  const [selected, setSelected] = useState<string | null>(variants[0]?.id ?? null);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  const current = variants.find((v) => v.id === selected);
  const unavailable = !current || current.inventory <= 0;

  return (
    <div>
      {variants.length > 0 && (
        <div>
          <span className="label block mb-3">Size</span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSel = v.id === selected;
              const out = v.inventory <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  onClick={() => setSelected(v.id)}
                  aria-pressed={isSel}
                  className={cn(
                    "label h-11 min-w-[44px] px-3 border transition-colors duration-fast",
                    out
                      ? "border-ink-300 text-ink-300 line-through cursor-not-allowed"
                      : isSel
                        ? "border-ink-900 bg-ink-900 text-paper"
                        : "border-ink-300 hover:border-ink-900"
                  )}
                >
                  {v.size ?? v.color ?? v.sku}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={unavailable}
        className="btn-primary mt-6"
        onClick={() => {
          if (!current) return;
          add({
            productId: product.id,
            variantId: current.id,
            slug: product.slug,
            name: product.name,
            variantLabel: current.size ?? current.color ?? undefined,
            unitPriceUsdMinor: product.priceUsdMinor,
            imageUrl: product.imageUrl,
            qty: 1,
          });
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
      >
        {unavailable ? "Unavailable" : added ? "Added" : "Add to bag"}
      </button>
    </div>
  );
}
