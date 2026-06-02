import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import {
  useWishlist,
  useWishlistOptional,
  WishlistProvider,
  type WishlistItem,
} from "./wishlist-provider";

const STORAGE_KEY = "m0:wishlist";

function makeItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    productId: "p-1",
    slug: "tee",
    name: "Plain tee",
    priceUsdMinor: 2500,
    ...overrides,
  };
}

function Probe({
  onReady,
}: {
  onReady?: (api: ReturnType<typeof useWishlist>) => void;
}) {
  const api = useWishlist();
  React.useEffect(() => {
    onReady?.(api);
  }, [api, onReady]);
  return (
    <div>
      <div data-testid="count">{api.count}</div>
      <ul data-testid="items">
        {api.items.map((i) => (
          <li key={i.productId} data-pid={i.productId}>
            {i.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderWith(seed?: WishlistItem[]) {
  if (seed) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  let api!: ReturnType<typeof useWishlist>;
  const utils = render(
    <WishlistProvider>
      <Probe onReady={(a) => (api = a)} />
    </WishlistProvider>,
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

describe("WishlistProvider — hydration", () => {
  test("starts empty when localStorage has no entry", () => {
    renderWith();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  test("hydrates from localStorage on mount", () => {
    renderWith([makeItem(), makeItem({ productId: "p-2", name: "Cardigan" })]);
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  test("survives malformed JSON in localStorage", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid");
    renderWith();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

describe("WishlistProvider — mutations", () => {
  test("add inserts a new item", () => {
    const { getApi } = renderWith();
    act(() => getApi().add(makeItem()));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  test("add is idempotent — repeated adds do not duplicate", () => {
    const { getApi } = renderWith();
    act(() => {
      getApi().add(makeItem());
      getApi().add(makeItem());
      getApi().add(makeItem());
    });
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  test("remove drops the matching productId", () => {
    const { getApi } = renderWith([
      makeItem(),
      makeItem({ productId: "p-2" }),
    ]);
    act(() => getApi().remove("p-1"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("items").firstChild).toHaveAttribute(
      "data-pid",
      "p-2",
    );
  });

  test("toggle adds when missing and removes when present", () => {
    const { getApi } = renderWith();
    act(() => getApi().toggle(makeItem()));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    act(() => getApi().toggle(makeItem()));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  test("has reflects whether an id is wishlisted", () => {
    const { getApi } = renderWith([makeItem()]);
    expect(getApi().has("p-1")).toBe(true);
    expect(getApi().has("p-missing")).toBe(false);
  });

  test("clear empties the wishlist", () => {
    const { getApi } = renderWith([makeItem(), makeItem({ productId: "p-2" })]);
    act(() => getApi().clear());
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

describe("WishlistProvider — persistence across remounts", () => {
  test("persists adds to localStorage", async () => {
    const { getApi, unmount } = renderWith();
    act(() => getApi().add(makeItem()));
    await Promise.resolve();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toHaveLength(1);

    unmount();
    renderWith();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });
});

describe("useWishlistOptional", () => {
  function OptionalProbe() {
    const api = useWishlistOptional();
    return <div data-testid="optional">{api === null ? "absent" : "present"}</div>;
  }

  test("returns null when used outside a WishlistProvider", () => {
    render(<OptionalProbe />);
    expect(screen.getByTestId("optional")).toHaveTextContent("absent");
  });

  test("returns the context value when wrapped", () => {
    render(
      <WishlistProvider>
        <OptionalProbe />
      </WishlistProvider>,
    );
    expect(screen.getByTestId("optional")).toHaveTextContent("present");
  });
});

describe("useWishlist — without provider", () => {
  test("throws a helpful error", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/useWishlist must be used inside/);
    } finally {
      console.error = originalError;
    }
  });
});
