/**
 * Order reference generator.
 *
 * Format: `M0-YYYYMMDD-NNNN` where NNNN is a 4-digit random number in [1000, 9999].
 * The date portion is UTC so references issued near midnight are stable
 * regardless of the server's local zone.
 *
 * `now` and `random` are injectable for deterministic tests.
 */
export interface NextReferenceOptions {
  now?: Date;
  random?: () => number;
}

export function nextReference(opts: NextReferenceOptions = {}): string {
  const d = opts.now ?? new Date();
  const random = opts.random ?? Math.random;
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.floor(random() * 9000 + 1000);
  return `M0-${ymd}-${rand}`;
}

/**
 * Regex matching the canonical reference format. Use for validation when
 * accepting a reference from the URL (`/track?ref=...`) or from user input.
 */
export const REFERENCE_REGEX = /^M0-\d{8}-\d{4}$/;
