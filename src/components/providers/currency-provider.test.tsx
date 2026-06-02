import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { CurrencyProvider, useCurrency } from "./currency-provider";

const STORAGE_KEY = "m0:currency";

function Probe({
  onReady,
}: {
  onReady?: (api: ReturnType<typeof useCurrency>) => void;
}) {
  const api = useCurrency();
  React.useEffect(() => {
    onReady?.(api);
  }, [api, onReady]);
  return <div data-testid="currency">{api.currency}</div>;
}

function renderWithCurrency() {
  let api!: ReturnType<typeof useCurrency>;
  const utils = render(
    <CurrencyProvider>
      <Probe onReady={(a) => (api = a)} />
    </CurrencyProvider>,
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

describe("CurrencyProvider — default + hydration", () => {
  test("defaults to USD when nothing is stored", () => {
    renderWithCurrency();
    expect(screen.getByTestId("currency")).toHaveTextContent("USD");
  });

  test("hydrates a previously-stored currency on mount", () => {
    window.localStorage.setItem(STORAGE_KEY, "ZWG");
    renderWithCurrency();
    expect(screen.getByTestId("currency")).toHaveTextContent("ZWG");
  });

  test("ignores an unsupported stored value (defends against corrupted storage)", () => {
    // SUPPORTED_CURRENCIES is ["USD", "ZWG"]. "GBP" must be rejected.
    window.localStorage.setItem(STORAGE_KEY, "GBP");
    renderWithCurrency();
    expect(screen.getByTestId("currency")).toHaveTextContent("USD");
  });
});

describe("CurrencyProvider — setCurrency", () => {
  test("updates the in-memory currency and persists to localStorage", () => {
    const { getApi } = renderWithCurrency();
    act(() => {
      getApi().setCurrency("ZWG");
    });
    expect(screen.getByTestId("currency")).toHaveTextContent("ZWG");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("ZWG");
  });

  test("setting back to USD persists USD (not removed)", () => {
    window.localStorage.setItem(STORAGE_KEY, "ZWG");
    const { getApi } = renderWithCurrency();
    act(() => {
      getApi().setCurrency("USD");
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("USD");
  });
});

describe("useCurrency — outside the provider", () => {
  test("throws a helpful error when used without <CurrencyProvider>", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(
        /useCurrency must be used inside/,
      );
    } finally {
      console.error = originalError;
    }
  });
});
