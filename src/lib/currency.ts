/**
 * Currency / FX helpers.
 *
 * Storefront prices live in USD cents. We render ZWG by multiplying the USD
 * value by a daily FX rate, snapshotted on each order so totals reconcile if
 * the rate moves before delivery.
 *
 * If FX_API_URL is set we fetch live rates (re-used via Vercel's edge cache).
 * Otherwise we fall back to a hardcoded rate — keep this conservative.
 */

export type Currency = "USD" | "ZWG";

export const SUPPORTED_CURRENCIES: Currency[] = ["USD", "ZWG"];

export const CURRENCY_LABEL: Record<Currency, string> = {
  USD: "USD",
  ZWG: "ZWG",
};

const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  ZWG: 26, // Conservative placeholder. Override via FX_API_URL.
};

interface ErApiResponse {
  rates: Record<string, number>;
  base_code: string;
  time_last_update_unix?: number;
}

let memo: { fetchedAt: number; rates: Record<Currency, number> } | null = null;

async function loadRates(): Promise<Record<Currency, number>> {
  // 6h memo
  if (memo && Date.now() - memo.fetchedAt < 6 * 60 * 60 * 1000) return memo.rates;

  const url = process.env.FX_API_URL;
  if (!url) {
    memo = { fetchedAt: Date.now(), rates: FALLBACK_RATES };
    return FALLBACK_RATES;
  }

  try {
    const res = await fetch(url, {
      // Edge cache for an hour
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
    const json = (await res.json()) as ErApiResponse;
    const rates: Record<Currency, number> = {
      USD: 1,
      ZWG: json.rates.ZWG ?? json.rates.ZWL ?? FALLBACK_RATES.ZWG,
    };
    memo = { fetchedAt: Date.now(), rates };
    return rates;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[fx] using fallback rates", err);
    memo = { fetchedAt: Date.now(), rates: FALLBACK_RATES };
    return FALLBACK_RATES;
  }
}

export async function convertFromUsdMinor(usdMinor: number, target: Currency): Promise<number> {
  const rates = await loadRates();
  return Math.round(usdMinor * rates[target]);
}

export async function getRate(target: Currency): Promise<number> {
  const rates = await loadRates();
  return rates[target];
}

/** Format minor units as a localized string. ZWG uses generic number format
 * since Intl doesn't fully support it everywhere. */
export function formatPrice(minor: number, currency: Currency, locale = "en-US"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  }
  // ZWG fallback formatter
  return `ZWG ${(minor / 100).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
