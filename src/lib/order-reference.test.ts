import { describe, expect, test } from "vitest";
import { nextReference, REFERENCE_REGEX } from "./order-reference";

describe("nextReference — format", () => {
  test("uses M0-YYYYMMDD-NNNN format", () => {
    const ref = nextReference({ now: new Date("2026-06-01T12:00:00Z"), random: () => 0.5 });
    expect(ref).toMatch(REFERENCE_REGEX);
  });

  test("embeds the UTC year-month-day", () => {
    const ref = nextReference({
      now: new Date("2026-06-01T12:00:00Z"),
      random: () => 0.5,
    });
    expect(ref.startsWith("M0-20260601-")).toBe(true);
  });

  test("pads single-digit months and days", () => {
    const ref = nextReference({
      now: new Date("2026-01-05T12:00:00Z"),
      random: () => 0.5,
    });
    expect(ref.startsWith("M0-20260105-")).toBe(true);
  });

  test("uses UTC, not local — references near midnight are stable", () => {
    // 23:30 in a UTC+8 zone is 15:30 the SAME day in UTC. Whether the
    // reference reflects local or UTC matters for ordering. We pin to UTC.
    const justBeforeMidnightUtcPlus8 = new Date("2026-06-01T15:30:00Z");
    const ref = nextReference({
      now: justBeforeMidnightUtcPlus8,
      random: () => 0.5,
    });
    expect(ref.startsWith("M0-20260601-")).toBe(true);
  });
});

describe("nextReference — random portion", () => {
  test("random portion is always 4 digits in [1000, 9999]", () => {
    // Test the boundaries: random() returning 0 and just-under-1.
    const minRef = nextReference({
      now: new Date("2026-06-01T12:00:00Z"),
      random: () => 0,
    });
    const maxRef = nextReference({
      now: new Date("2026-06-01T12:00:00Z"),
      random: () => 0.999999,
    });
    expect(minRef.endsWith("-1000")).toBe(true);
    expect(maxRef.endsWith("-9999")).toBe(true);
  });

  test("never exceeds 4-digit cap — formula floor(rand * 9000 + 1000)", () => {
    // floor(1.0 * 9000 + 1000) would be 10000 if rand could equal 1, but
    // Math.random returns < 1 so we expect the implementation to stay safe.
    // Use 0.999999 as the realistic worst case.
    const ref = nextReference({
      now: new Date("2026-06-01T12:00:00Z"),
      random: () => 0.999999,
    });
    const trailing = ref.split("-").pop()!;
    expect(trailing.length).toBe(4);
    expect(Number(trailing)).toBeLessThanOrEqual(9999);
  });

  test("uses the supplied random for determinism", () => {
    let i = 0;
    const samples = [0.1, 0.2, 0.3];
    const next = () => samples[i++];
    const refs = [
      nextReference({ now: new Date("2026-06-01T12:00:00Z"), random: next }),
      nextReference({ now: new Date("2026-06-01T12:00:00Z"), random: next }),
      nextReference({ now: new Date("2026-06-01T12:00:00Z"), random: next }),
    ];
    expect(refs).toEqual([
      "M0-20260601-1900",
      "M0-20260601-2800",
      "M0-20260601-3700",
    ]);
  });
});

describe("REFERENCE_REGEX", () => {
  test("accepts canonical references", () => {
    expect(REFERENCE_REGEX.test("M0-20260601-1234")).toBe(true);
    expect(REFERENCE_REGEX.test("M0-20260101-9999")).toBe(true);
  });

  test("rejects malformed references", () => {
    expect(REFERENCE_REGEX.test("M0-2026-1234")).toBe(false);          // bad date
    expect(REFERENCE_REGEX.test("m0-20260601-1234")).toBe(false);       // lowercase
    expect(REFERENCE_REGEX.test("M0-20260601-123")).toBe(false);        // short suffix
    expect(REFERENCE_REGEX.test("M0-20260601-12345")).toBe(false);      // long suffix
    expect(REFERENCE_REGEX.test("M0-20260601-1234X")).toBe(false);      // trailing junk
    expect(REFERENCE_REGEX.test("M0-20260601-abcd")).toBe(false);       // non-digit suffix
    expect(REFERENCE_REGEX.test("")).toBe(false);
  });
});
