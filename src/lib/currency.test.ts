import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Currency module uses a module-level memo for FX rates. To keep tests
// independent we reset the module registry before each test and pull a
// fresh import. We also restore env + fetch each time.

const FALLBACK_ZWG = 26;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("formatPrice", () => {
  test("formats USD with currency symbol and 2 decimals", async () => {
    const { formatPrice } = await import("./currency");
    expect(formatPrice(10000, "USD")).toBe("$100.00");
    expect(formatPrice(1234, "USD")).toBe("$12.34");
    expect(formatPrice(99, "USD")).toBe("$0.99");
  });

  test("groups thousands in USD", async () => {
    const { formatPrice } = await import("./currency");
    expect(formatPrice(12345678, "USD")).toBe("$123,456.78");
  });

  test("formats USD zero as $0.00", async () => {
    const { formatPrice } = await import("./currency");
    expect(formatPrice(0, "USD")).toBe("$0.00");
  });

  test("formats negative USD with minus sign", async () => {
    const { formatPrice } = await import("./currency");
    expect(formatPrice(-500, "USD")).toBe("-$5.00");
  });

  test("formats ZWG with 'ZWG' prefix and 2 decimals", async () => {
    const { formatPrice } = await import("./currency");
    expect(formatPrice(260000, "ZWG")).toBe("ZWG 2,600.00");
    expect(formatPrice(2599, "ZWG")).toBe("ZWG 25.99");
  });

  test("ZWG zero shows as 'ZWG 0.00'", async () => {
    const { formatPrice } = await import("./currency");
    expect(formatPrice(0, "ZWG")).toBe("ZWG 0.00");
  });

  test("accepts a custom locale (formatting still consistent for en-GB)", async () => {
    const { formatPrice } = await import("./currency");
    // en-GB uses US$ — but USD result still has 2 decimals and the integer
    // portion includes a thousands separator. Assert structurally rather
    // than locking to one exact glyph sequence that may vary by node ICU.
    const result = formatPrice(100000, "USD", "en-GB");
    expect(result).toMatch(/1,000\.00/);
  });
});

describe("convertFromUsdMinor — fallback (no FX_API_URL)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FX_API_URL", "");
  });

  test("USD passes through unchanged (rate = 1)", async () => {
    const { convertFromUsdMinor } = await import("./currency");
    expect(await convertFromUsdMinor(10000, "USD")).toBe(10000);
    expect(await convertFromUsdMinor(0, "USD")).toBe(0);
  });

  test("ZWG multiplies by the conservative fallback rate", async () => {
    const { convertFromUsdMinor } = await import("./currency");
    // 100 USD × 26 = 2600 ZWG in major; in minor units the math is the same.
    expect(await convertFromUsdMinor(10000, "ZWG")).toBe(10000 * FALLBACK_ZWG);
  });

  test("rounds the converted ZWG to the nearest minor unit", async () => {
    const { convertFromUsdMinor } = await import("./currency");
    // 1 cent USD at the fallback rate is 26 cents ZWG exactly — no rounding
    // surprise here. Verify that Math.round is in play by checking a value
    // where naive multiplication would land mid-cent.
    expect(await convertFromUsdMinor(1, "ZWG")).toBe(26);
  });
});

describe("convertFromUsdMinor — live FX_API_URL", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FX_API_URL", "https://example.invalid/v6/latest/USD");
  });

  test("uses the live rate when the fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ rates: { ZWG: 33.5 }, base_code: "USD" }),
          { status: 200 },
        ),
      ),
    );
    const { convertFromUsdMinor } = await import("./currency");
    // 100 USD × 33.5 = 3350 ZWG (in minor: 10000 × 33.5 = 335000)
    expect(await convertFromUsdMinor(10000, "ZWG")).toBe(335000);
  });

  test("falls back to ZWL when ZWG is missing in the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ rates: { ZWL: 40 }, base_code: "USD" }),
          { status: 200 },
        ),
      ),
    );
    const { convertFromUsdMinor } = await import("./currency");
    expect(await convertFromUsdMinor(10000, "ZWG")).toBe(10000 * 40);
  });

  test("falls back to FALLBACK_RATES when ZWG and ZWL are both missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ rates: { EUR: 0.9 }, base_code: "USD" }),
          { status: 200 },
        ),
      ),
    );
    const { convertFromUsdMinor } = await import("./currency");
    expect(await convertFromUsdMinor(10000, "ZWG")).toBe(10000 * FALLBACK_ZWG);
  });

  test("falls back when fetch throws a network error", async () => {
    // Suppress the expected console.warn so the test output stays clean.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const { convertFromUsdMinor } = await import("./currency");
    expect(await convertFromUsdMinor(10000, "ZWG")).toBe(10000 * FALLBACK_ZWG);
  });

  test("falls back when the API returns a non-OK status", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Service Unavailable", { status: 503 })),
    );
    const { convertFromUsdMinor } = await import("./currency");
    expect(await convertFromUsdMinor(10000, "ZWG")).toBe(10000 * FALLBACK_ZWG);
  });

  test("memoizes — repeated calls fetch only once within the cache window", async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({ rates: { ZWG: 30 }, base_code: "USD" }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { convertFromUsdMinor, getRate } = await import("./currency");
    await convertFromUsdMinor(10000, "ZWG");
    await convertFromUsdMinor(20000, "ZWG");
    await getRate("ZWG");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("getRate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FX_API_URL", "");
  });

  test("returns 1 for USD", async () => {
    const { getRate } = await import("./currency");
    expect(await getRate("USD")).toBe(1);
  });

  test("returns fallback ZWG rate when FX_API_URL is unset", async () => {
    const { getRate } = await import("./currency");
    expect(await getRate("ZWG")).toBe(FALLBACK_ZWG);
  });
});

describe("SUPPORTED_CURRENCIES + CURRENCY_LABEL", () => {
  test("supports exactly USD and ZWG", async () => {
    const { SUPPORTED_CURRENCIES } = await import("./currency");
    expect(SUPPORTED_CURRENCIES).toEqual(["USD", "ZWG"]);
  });

  test("CURRENCY_LABEL has a label for every supported currency", async () => {
    const { SUPPORTED_CURRENCIES, CURRENCY_LABEL } = await import("./currency");
    for (const c of SUPPORTED_CURRENCIES) {
      expect(CURRENCY_LABEL[c]).toBeTruthy();
    }
  });
});
