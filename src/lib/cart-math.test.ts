import { describe, expect, test } from "vitest";
import {
  addLine,
  FLAT_SHIPPING_USD_MINOR,
  FREE_SHIPPING_THRESHOLD_USD_MINOR,
  lineCount,
  qualifiesForFreeShipping,
  removeLine,
  setLineQty,
  shippingUsdMinor,
  subtotalUsdMinor,
} from "./cart-math";

// A minimal cart line that satisfies CartLineMath — the same shape the
// provider uses but trimmed for test fixtures.
function line(
  variantId: string,
  unitPriceUsdMinor: number,
  qty: number,
): { variantId: string; unitPriceUsdMinor: number; qty: number } {
  return { variantId, unitPriceUsdMinor, qty };
}

describe("lineCount", () => {
  test("returns 0 for an empty cart", () => {
    expect(lineCount([])).toBe(0);
  });

  test("sums quantities across lines", () => {
    expect(
      lineCount([
        line("a", 1000, 2),
        line("b", 500, 3),
      ]),
    ).toBe(5);
  });
});

describe("subtotalUsdMinor", () => {
  test("returns 0 for an empty cart", () => {
    expect(subtotalUsdMinor([])).toBe(0);
  });

  test("sums unit price × qty across lines", () => {
    // 1 × $90 + 2 × $2.50 = $95
    expect(
      subtotalUsdMinor([
        line("a", 9000, 1),
        line("b", 250, 2),
      ]),
    ).toBe(9500);
  });

  test("uses integer math — no floating-point drift on cent amounts", () => {
    // 100 × $0.10 (10 cents) = $10.00 exactly. With floats this can be 9.99…
    expect(subtotalUsdMinor([line("a", 10, 100)])).toBe(1000);
  });
});

describe("shippingUsdMinor", () => {
  test("is the flat fee when subtotal is below the threshold", () => {
    expect(shippingUsdMinor(0)).toBe(FLAT_SHIPPING_USD_MINOR);
    expect(shippingUsdMinor(9999)).toBe(FLAT_SHIPPING_USD_MINOR);
  });

  test("is zero at exactly the threshold (free over USD 100 inclusive)", () => {
    expect(shippingUsdMinor(FREE_SHIPPING_THRESHOLD_USD_MINOR)).toBe(0);
  });

  test("is zero above the threshold", () => {
    expect(shippingUsdMinor(50000)).toBe(0);
  });
});

describe("qualifiesForFreeShipping", () => {
  test("is true at and above the threshold", () => {
    expect(qualifiesForFreeShipping(FREE_SHIPPING_THRESHOLD_USD_MINOR)).toBe(true);
    expect(qualifiesForFreeShipping(50000)).toBe(true);
  });

  test("is false below the threshold", () => {
    expect(qualifiesForFreeShipping(9999)).toBe(false);
    expect(qualifiesForFreeShipping(0)).toBe(false);
  });
});

describe("addLine", () => {
  test("appends a new variant", () => {
    const result = addLine([], line("a", 1000, 1));
    expect(result).toEqual([line("a", 1000, 1)]);
  });

  test("increments qty when the variant already exists", () => {
    const result = addLine([line("a", 1000, 1)], line("a", 1000, 2));
    expect(result).toEqual([line("a", 1000, 3)]);
  });

  test("treats different variantIds as different lines, even with the same price", () => {
    const result = addLine([line("a", 1000, 1)], line("b", 1000, 1));
    expect(result).toEqual([line("a", 1000, 1), line("b", 1000, 1)]);
  });

  test("does not mutate the input array", () => {
    const original = [line("a", 1000, 1)];
    addLine(original, line("a", 1000, 2));
    expect(original).toEqual([line("a", 1000, 1)]);
  });
});

describe("removeLine", () => {
  test("removes a line by variantId", () => {
    const result = removeLine(
      [line("a", 1000, 1), line("b", 500, 2)],
      "a",
    );
    expect(result).toEqual([line("b", 500, 2)]);
  });

  test("is a no-op when the variant isn't present", () => {
    const result = removeLine([line("a", 1000, 1)], "missing");
    expect(result).toEqual([line("a", 1000, 1)]);
  });

  test("does not mutate the input array", () => {
    const original = [line("a", 1000, 1)];
    removeLine(original, "a");
    expect(original).toEqual([line("a", 1000, 1)]);
  });
});

describe("setLineQty", () => {
  test("updates qty for the matching variant", () => {
    const result = setLineQty([line("a", 1000, 1)], "a", 5);
    expect(result).toEqual([line("a", 1000, 5)]);
  });

  test("leaves other lines untouched", () => {
    const result = setLineQty(
      [line("a", 1000, 1), line("b", 500, 2)],
      "a",
      5,
    );
    expect(result).toEqual([line("a", 1000, 5), line("b", 500, 2)]);
  });

  test("drops the line when qty hits zero", () => {
    const result = setLineQty([line("a", 1000, 1)], "a", 0);
    expect(result).toEqual([]);
  });

  test("drops the line when qty goes negative", () => {
    const result = setLineQty([line("a", 1000, 1)], "a", -3);
    expect(result).toEqual([]);
  });

  test("does not mutate the input array", () => {
    const original = [line("a", 1000, 1)];
    setLineQty(original, "a", 5);
    expect(original).toEqual([line("a", 1000, 1)]);
  });
});
