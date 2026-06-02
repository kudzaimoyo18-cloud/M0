import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { CartProvider, useCart, type CartLine } from "./cart-provider";

// Test the cart provider through its public API (the useCart hook). Pure
// reducer behavior is already covered by cart-math.test.ts — these tests
// focus on what the provider adds on top: localStorage persistence,
// hydration on mount, and the React context contract.

const STORAGE_KEY = "m0:cart";

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: "p-1",
    variantId: "v-1",
    slug: "tee",
    name: "Plain tee",
    unitPriceUsdMinor: 2500,
    qty: 1,
    ...overrides,
  };
}

/**
 * Tiny probe component that reads cart state into the DOM so RTL can assert
 * against it. We expose count + subtotal + the line-by-line names; that's
 * everything any real consumer of the hook reads.
 */
function Probe({ onReady }: { onReady?: (api: ReturnType<typeof useCart>) => void }) {
  const api = useCart();
  React.useEffect(() => {
    onReady?.(api);
  }, [api, onReady]);
  return (
    <div>
      <div data-testid="count">{api.count}</div>
      <div data-testid="subtotal">{api.subtotalUsdMinor}</div>
      <ul data-testid="lines">
        {api.lines.map((l) => (
          <li key={l.variantId} data-variant={l.variantId}>
            {l.name} × {l.qty} = {l.unitPriceUsdMinor * l.qty}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderWithCart(seedStorage?: CartLine[]) {
  if (seedStorage !== undefined) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedStorage));
  }
  let api!: ReturnType<typeof useCart>;
  const utils = render(
    <CartProvider>
      <Probe onReady={(a) => (api = a)} />
    </CartProvider>,
  );
  return { ...utils, getApi: () => api };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("CartProvider — hydration", () => {
  test("starts empty when localStorage is empty", () => {
    renderWithCart();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("0");
  });

  test("hydrates from localStorage on mount", () => {
    renderWithCart([makeLine({ qty: 3 })]);
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("7500"); // 2500 × 3
  });

  test("survives malformed localStorage gracefully (no crash, falls back to empty)", () => {
    window.localStorage.setItem(STORAGE_KEY, "not valid json {");
    renderWithCart();
    // Provider should swallow the parse error and start with an empty cart
    // rather than throwing during render.
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

describe("CartProvider — mutations", () => {
  test("add adds a new line and increments count + subtotal", () => {
    const { getApi } = renderWithCart();
    act(() => {
      getApi().add(makeLine({ qty: 2 }));
    });
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("5000");
  });

  test("add merges qty when the same variant is added twice", () => {
    const { getApi } = renderWithCart();
    act(() => {
      getApi().add(makeLine({ qty: 1 }));
      getApi().add(makeLine({ qty: 2 }));
    });
    expect(screen.getByTestId("count")).toHaveTextContent("3");
    expect(screen.getByTestId("lines").children).toHaveLength(1);
  });

  test("add treats different variantIds as distinct lines", () => {
    const { getApi } = renderWithCart();
    act(() => {
      getApi().add(makeLine({ variantId: "v-1" }));
      getApi().add(makeLine({ variantId: "v-2", name: "Cardigan" }));
    });
    expect(screen.getByTestId("lines").children).toHaveLength(2);
  });

  test("remove drops a line by variantId", () => {
    const { getApi } = renderWithCart([
      makeLine({ variantId: "v-1" }),
      makeLine({ variantId: "v-2", name: "Cardigan" }),
    ]);
    act(() => {
      getApi().remove("v-1");
    });
    expect(screen.getByTestId("lines").children).toHaveLength(1);
    expect(screen.getByTestId("lines").firstChild).toHaveTextContent(
      /Cardigan/,
    );
  });

  test("setQty updates the line quantity", () => {
    const { getApi } = renderWithCart([makeLine({ qty: 1 })]);
    act(() => {
      getApi().setQty("v-1", 5);
    });
    expect(screen.getByTestId("count")).toHaveTextContent("5");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("12500");
  });

  test("setQty(0) removes the line", () => {
    const { getApi } = renderWithCart([makeLine({ qty: 1 })]);
    act(() => {
      getApi().setQty("v-1", 0);
    });
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("lines").children).toHaveLength(0);
  });

  test("clear empties the cart", () => {
    const { getApi } = renderWithCart([
      makeLine({ variantId: "v-1" }),
      makeLine({ variantId: "v-2", name: "Cardigan" }),
    ]);
    act(() => {
      getApi().clear();
    });
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("lines").children).toHaveLength(0);
  });
});

describe("CartProvider — localStorage persistence", () => {
  test("persists added items so a remount restores them", async () => {
    const { getApi, unmount } = renderWithCart();
    act(() => {
      getApi().add(makeLine({ qty: 2 }));
    });
    // Flush any pending effect that writes to localStorage.
    await Promise.resolve();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ variantId: "v-1", qty: 2 });

    unmount();

    // Fresh render should hydrate the same cart.
    renderWithCart();
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  test("persists clear (empty array)", async () => {
    const { getApi } = renderWithCart([makeLine({ qty: 2 })]);
    act(() => {
      getApi().clear();
    });
    await Promise.resolve();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });
});

describe("useCart — outside the provider", () => {
  test("throws a helpful error if used without <CartProvider>", () => {
    // React surfaces the throw via the error boundary system. We catch it
    // here by silencing console.error and rendering directly.
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(
        /useCart must be used inside/,
      );
    } finally {
      console.error = originalError;
    }
  });
});
