import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Helpers under test read NEXT_PUBLIC_WHATSAPP_NUMBER from process.env.
// We stub it explicitly per test so behavior is deterministic regardless
// of the local .env.

const BASE_INPUT = {
  reference: "M0-20260601-1234",
  currency: "USD",
  totalMinor: 9500,
  shipping: {
    name: "Tendai Moyo",
    phone: "+263 77 123 4567",
    line1: "12 Birdwood Road",
    line2: null,
    city: "Harare",
    country: "ZW",
  },
  lines: [
    {
      name: "Belted overcoat",
      variantLabel: "M / Black",
      qty: 1,
      unitPriceMinor: 9000,
    },
    {
      name: "Plain tee",
      variantLabel: null,
      qty: 2,
      unitPriceMinor: 250,
    },
  ],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getDestinationDigits", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("strips non-digits from the configured number", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+263 (77) 123-4567");
    const { getDestinationDigits } = await import("./whatsapp");
    expect(getDestinationDigits()).toBe("263771234567");
  });

  test("returns an empty string when the env var is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    const { getDestinationDigits } = await import("./whatsapp");
    expect(getDestinationDigits()).toBe("");
  });

  test("returns an empty string when the env var is entirely non-digits", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+()- ");
    const { getDestinationDigits } = await import("./whatsapp");
    expect(getDestinationDigits()).toBe("");
  });
});

describe("getDisplayNumber", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("prepends a + to the digits", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+263 (77) 123-4567");
    const { getDisplayNumber } = await import("./whatsapp");
    expect(getDisplayNumber()).toBe("+263771234567");
  });

  test("returns an empty string when no number is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    const { getDisplayNumber } = await import("./whatsapp");
    expect(getDisplayNumber()).toBe("");
  });
});

describe("buildOrderMessage", () => {
  test("starts with the order reference as the header line", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage(BASE_INPUT);
    expect(msg.split("\n")[0]).toBe("*M0 — Order M0-20260601-1234*");
  });

  test("lists every cart line with name, qty, and unit total", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage(BASE_INPUT);
    expect(msg).toContain("• Belted overcoat (M / Black) × 1 — USD 90.00");
    // Plain tee: 2 × $2.50 = $5.00
    expect(msg).toContain("• Plain tee × 2 — USD 5.00");
  });

  test("omits the variant label when it is null or missing", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage({
      ...BASE_INPUT,
      lines: [
        { name: "Plain tee", variantLabel: null, qty: 1, unitPriceMinor: 250 },
      ],
    });
    // No parens before the × when variantLabel is null
    expect(msg).toMatch(/• Plain tee × 1 —/);
    expect(msg).not.toMatch(/\(null\)/);
  });

  test("renders the total in the chosen currency", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    expect(buildOrderMessage(BASE_INPUT)).toContain("*Total* USD 95.00");
    expect(
      buildOrderMessage({ ...BASE_INPUT, currency: "ZWG", totalMinor: 247000 }),
    ).toContain("*Total* ZWG 2470.00");
  });

  test("includes the new payment + delivery copy (5–7 days, no COD)", async () => {
    // Pinning the new business model so a future copy regression that
    // re-introduces cash-on-delivery wording can't pass silently.
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage(BASE_INPUT);
    expect(msg).toContain("Payment arranged on this thread");
    expect(msg).toContain("Delivery 5–7 days from confirmation");
    expect(msg.toLowerCase()).not.toContain("cash on delivery");
    expect(msg.toLowerCase()).not.toContain("cod");
  });

  test("ship-to block includes name, address, city/country, and phone in order", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage(BASE_INPUT);
    const shipIdx = msg.indexOf("*Ship to*");
    expect(shipIdx).toBeGreaterThan(0);
    const after = msg.slice(shipIdx).split("\n");
    expect(after[0]).toBe("*Ship to*");
    expect(after[1]).toBe("Tendai Moyo");
    expect(after[2]).toBe("12 Birdwood Road");
    expect(after[3]).toBe("Harare, ZW");
    expect(after[4]).toBe("+263 77 123 4567");
  });

  test("includes line2 between line1 and city when provided", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage({
      ...BASE_INPUT,
      shipping: { ...BASE_INPUT.shipping, line2: "Apt 4B" },
    });
    const after = msg.slice(msg.indexOf("*Ship to*")).split("\n");
    expect(after[2]).toBe("12 Birdwood Road");
    expect(after[3]).toBe("Apt 4B");
    expect(after[4]).toBe("Harare, ZW");
  });

  test("appends a tracking link when siteUrl is provided", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage({ ...BASE_INPUT, siteUrl: "https://m0.shop" });
    expect(msg).toContain("Order ref: https://m0.shop/account");
  });

  test("omits the tracking link when siteUrl is missing", async () => {
    const { buildOrderMessage } = await import("./whatsapp");
    const msg = buildOrderMessage(BASE_INPUT);
    expect(msg).not.toContain("Order ref:");
  });
});

describe("buildWhatsAppUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns null when no destination is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    const { buildWhatsAppUrl } = await import("./whatsapp");
    expect(buildWhatsAppUrl(BASE_INPUT)).toBeNull();
  });

  test("returns a wa.me URL with digits-only destination and URL-encoded body", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+263 (77) 123-4567");
    const { buildWhatsAppUrl, buildOrderMessage } = await import("./whatsapp");
    const url = buildWhatsAppUrl(BASE_INPUT);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.host).toBe("wa.me");
    expect(parsed.pathname).toBe("/263771234567");

    // The text query parameter should decode back to the exact message body.
    const decoded = decodeURIComponent(parsed.searchParams.get("text") ?? "");
    expect(decoded).toBe(buildOrderMessage(BASE_INPUT));
  });

  test("encodes whitespace so the URL survives sharing while preserving WhatsApp bold formatting", async () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "263771234567");
    const { buildWhatsAppUrl } = await import("./whatsapp");
    const url = buildWhatsAppUrl(BASE_INPUT)!;
    const raw = url.split("?text=")[1];
    // Newlines and spaces must be encoded so the URL is shareable.
    expect(raw).toContain("%0A");
    expect(raw).toContain("%20");
    // Asterisks must remain literal in the URL — `encodeURIComponent` does
    // not touch them (they're URL-safe per RFC 3986), and WhatsApp needs
    // them intact to render bold (`*Total*`, `*Ship to*`, etc.).
    expect(raw).toContain("*");
  });
});
