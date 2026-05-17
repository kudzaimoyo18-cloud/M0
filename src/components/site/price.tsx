"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/components/providers/currency-provider";
import { formatPrice } from "@/lib/currency";

/**
 * Render a price in the currently selected currency. The USD amount is the
 * canonical input; this component fetches the current rate from /api/fx and
 * converts on the client. SSR shows USD by default to keep the markup stable.
 */
export function Price({
  usdMinor,
  compareUsdMinor,
  className,
}: {
  usdMinor: number;
  compareUsdMinor?: number | null;
  className?: string;
}) {
  const { currency } = useCurrency();
  const [rate, setRate] = useState<number>(1);

  useEffect(() => {
    if (currency === "USD") {
      setRate(1);
      return;
    }
    let cancelled = false;
    fetch(`/api/fx?target=${currency}`)
      .then((r) => r.json())
      .then((j: { rate?: number }) => {
        if (!cancelled && typeof j.rate === "number") setRate(j.rate);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const display = formatPrice(Math.round(usdMinor * rate), currency);
  const compare =
    typeof compareUsdMinor === "number" && compareUsdMinor > usdMinor
      ? formatPrice(Math.round(compareUsdMinor * rate), currency)
      : null;

  return (
    <span className={className}>
      <span className="tabular">{display}</span>
      {compare && (
        <span className="ml-2 text-ink-500 line-through tabular" aria-label={`Original price ${compare}`}>
          {compare}
        </span>
      )}
    </span>
  );
}
