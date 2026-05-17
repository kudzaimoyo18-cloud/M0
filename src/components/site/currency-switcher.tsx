"use client";

import { useCurrency } from "@/components/providers/currency-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({ dark = false }: { dark?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <div role="group" aria-label="Currency" className="flex items-center gap-2">
      {SUPPORTED_CURRENCIES.map((c, i) => (
        <span key={c} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrency(c)}
            aria-current={currency === c}
            className={cn(
              "label transition-opacity duration-fast",
              dark ? "text-paper" : "text-ink-900",
              currency === c ? "opacity-100 underline underline-offset-4" : "opacity-60 hover:opacity-100"
            )}
          >
            {c}
          </button>
          {i < SUPPORTED_CURRENCIES.length - 1 && (
            <span className={cn("label", dark ? "text-ink-500" : "text-ink-300")}>/</span>
          )}
        </span>
      ))}
    </div>
  );
}
