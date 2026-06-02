import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import CheckoutPage from "./page";
import { CartProvider, useCart, type CartLine } from "@/components/providers/cart-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";

// ── Mocks ────────────────────────────────────────────────────────────────
//
// The Price component fetches /api/fx in its own useEffect. We stub it to a
// simple span so the test focuses on the checkout form, not currency
// rendering (which is already covered by currency.test.ts).
vi.mock("@/components/site/price", () => ({
  Price: ({ usdMinor, className }: { usdMinor: number; className?: string }) => (
    <span className={className} data-testid="price">{usdMinor}</span>
  ),
}));

// ── Helpers ──────────────────────────────────────────────────────────────

const SAMPLE_LINE: CartLine = {
  productId: "p-1",
  variantId: "v-1",
  slug: "tee",
  name: "Plain tee",
  unitPriceUsdMinor: 9000, // $90
  qty: 1,
};

/**
 * Renders CheckoutPage inside the real providers, but optionally pre-seeds
 * the cart via localStorage so hydration produces a non-empty cart on mount.
 */
function renderCheckout(seedCart: CartLine[] = [SAMPLE_LINE]) {
  if (seedCart.length > 0) {
    window.localStorage.setItem("m0:cart", JSON.stringify(seedCart));
  }
  return render(
    <CurrencyProvider>
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    </CurrencyProvider>,
  );
}

/** Helper child that lets a test introspect the cart from outside the form. */
function CartReadout() {
  const { count } = useCart();
  return <div data-testid="external-count">{count}</div>;
}

function renderWithReadout(seedCart: CartLine[] = [SAMPLE_LINE]) {
  if (seedCart.length > 0) {
    window.localStorage.setItem("m0:cart", JSON.stringify(seedCart));
  }
  return render(
    <CurrencyProvider>
      <CartProvider>
        <CheckoutPage />
        <CartReadout />
      </CartProvider>
    </CurrencyProvider>,
  );
}

let fetchSpy: ReturnType<typeof vi.fn>;
let openSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  fetchSpy = vi.fn();
  openSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal("open", openSpy);

  // Replace window.location with a plain object so assigning .href doesn't
  // trigger jsdom navigation. Tests can then read window.location.href.
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "" },
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

// ── Tests ────────────────────────────────────────────────────────────────

describe("CheckoutPage — empty cart", () => {
  test("shows the empty-bag message when nothing is in the cart", () => {
    renderCheckout([]);
    expect(screen.getByText(/your bag is empty/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /order via whatsapp/i }),
    ).not.toBeInTheDocument();
  });
});

describe("CheckoutPage — form rendering", () => {
  test("renders all required shipping fields when the cart has items", () => {
    renderCheckout();
    expect(screen.getByRole("textbox", { name: /^email$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^full name$/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^address$/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^city$/i })).toBeInTheDocument();
  });

  test("city defaults to Harare and country defaults to ZW", () => {
    renderCheckout();
    expect(screen.getByRole("textbox", { name: /^city$/i })).toHaveValue(
      "Harare",
    );
    expect(screen.getByRole("textbox", { name: /^country$/i })).toHaveValue(
      "ZW",
    );
  });

  test("contains the new 5–7 day delivery copy (post-COD)", () => {
    renderCheckout();
    // Pin the messaging contract — if a future copy edit re-introduces
    // cash-on-delivery wording, these tests will catch it. The "5–7 days"
    // phrase appears in two places (the page lede and the summary caption),
    // so use getAllByText.
    expect(screen.getAllByText(/5–7 days/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/cash on delivery/i)).not.toBeInTheDocument();
  });

  test("submit button reads 'Order via WhatsApp' when idle", () => {
    renderCheckout();
    expect(
      screen.getByRole("button", { name: /^order via whatsapp$/i }),
    ).toBeInTheDocument();
  });
});

describe("CheckoutPage — submit success", () => {
  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole("textbox", { name: /^email$/i }), "x@y.zw");
    await user.type(screen.getByLabelText(/phone/i), "+263771234567");
    await user.type(screen.getByRole("textbox", { name: /^full name$/i }), "Tendai Moyo");
    await user.type(screen.getByRole("textbox", { name: /^address$/i }), "12 Birdwood Road");
    await user.click(
      screen.getByRole("button", { name: /order via whatsapp/i }),
    );
  }

  test("sends a correctly shaped payload to /api/checkout", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          reference: "M0-20260601-1234",
          redirectUrl: "https://wa.me/263771234567?text=hi",
          thanksUrl: "https://m0.shop/checkout/thanks?ref=M0-20260601-1234",
          whatsappConfigured: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const user = userEvent.setup();
    renderCheckout();
    await fillAndSubmit(user);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/checkout");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });

    const payload = JSON.parse(String(init.body));
    expect(payload.currency).toBe("USD");
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]).toMatchObject({
      productId: "p-1",
      variantId: "v-1",
      qty: 1,
      unitPriceUsdMinor: 9000,
    });
    expect(payload.shipping).toMatchObject({
      name: "Tendai Moyo",
      email: "x@y.zw",
      phone: "+263771234567",
      line1: "12 Birdwood Road",
      city: "Harare",
      country: "ZW",
    });
  });

  test("opens WhatsApp in a new tab and navigates to thanks when configured", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          redirectUrl: "https://wa.me/263771234567?text=hi",
          thanksUrl: "https://m0.shop/checkout/thanks?ref=M0-20260601-1234",
          whatsappConfigured: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const user = userEvent.setup();
    renderCheckout();
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        "https://wa.me/263771234567?text=hi",
        "_blank",
        "noopener,noreferrer",
      ),
    );
    expect(window.location.href).toBe(
      "https://m0.shop/checkout/thanks?ref=M0-20260601-1234",
    );
  });

  test("falls back to a same-tab redirect when WhatsApp is not configured", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          redirectUrl: "https://m0.shop/checkout/thanks?ref=M0-20260601-1234",
          whatsappConfigured: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const user = userEvent.setup();
    renderCheckout();
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(window.location.href).toBe(
        "https://m0.shop/checkout/thanks?ref=M0-20260601-1234",
      ),
    );
    expect(openSpy).not.toHaveBeenCalled();
  });

  test("clears the cart after a successful submit", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          redirectUrl: "https://wa.me/123?text=hi",
          thanksUrl: "https://m0.shop/checkout/thanks?ref=x",
          whatsappConfigured: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const user = userEvent.setup();
    renderWithReadout();
    expect(screen.getByTestId("external-count")).toHaveTextContent("1");

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByTestId("external-count")).toHaveTextContent("0"),
    );
  });
});

describe("CheckoutPage — submit error", () => {
  async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole("textbox", { name: /^email$/i }), "x@y.zw");
    await user.type(screen.getByLabelText(/phone/i), "+263771234567");
    await user.type(screen.getByRole("textbox", { name: /^full name$/i }), "Tendai Moyo");
    await user.type(screen.getByRole("textbox", { name: /^address$/i }), "12 Birdwood Road");
  }

  test("shows the server's error message when ok is false", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "We currently deliver to Harare only.",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );
    const user = userEvent.setup();
    renderCheckout();
    await fillRequired(user);

    // Override the city to something non-Harare so the test scenario reads true.
    await user.clear(screen.getByRole("textbox", { name: /^city$/i }));
    await user.type(
      screen.getByRole("textbox", { name: /^city$/i }),
      "Bulawayo",
    );

    await user.click(
      screen.getByRole("button", { name: /order via whatsapp/i }),
    );
    // The error message is rendered as role="alert"; the same phrase also
    // appears as a static caption next to the city field, so we scope to
    // the alert region.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/we currently deliver to harare only/i);
    // And the cart was NOT cleared on failure.
    expect(window.location.href).toBe("");
  });

  test("shows a generic message when the server returns ok=false with no error string", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const user = userEvent.setup();
    renderCheckout();
    await fillRequired(user);
    await user.click(
      screen.getByRole("button", { name: /order via whatsapp/i }),
    );
    expect(
      await screen.findByText(/could not place order/i),
    ).toBeInTheDocument();
  });
});
