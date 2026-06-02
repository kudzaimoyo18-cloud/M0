import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

/**
 * Shared-password admin gate, with rate limiting and a short cookie TTL.
 *
 * The middleware in src/middleware.ts is the primary gate. This module is
 * defense-in-depth: every admin server component / server action also calls
 * `requireAdmin()` before rendering or mutating.
 */

const COOKIE = "m0_admin";

function getPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export async function isAdmin(): Promise<boolean> {
  const password = getPassword();
  if (!password) return false;
  const jar = await cookies();
  const v = jar.get(COOKIE)?.value;
  if (!v) return false;
  try {
    const a = Buffer.from(v);
    const b = Buffer.from(password);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/signin");
}

export async function setAdminCookie(password: string) {
  const jar = await cookies();
  jar.set(COOKIE, password, {
    httpOnly: true,
    // `strict` (not `lax`) — there is no flow that requires the admin
    // cookie on cross-site GET navigation, and `lax` leaves destructive
    // GET endpoints (notably /api/admin/seed) reachable from CSRF probes.
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Dropped from 14d → 24h to limit damage from a leaked session.
    maxAge: 60 * 60 * 24,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function checkPassword(input: string): boolean {
  const password = getPassword();
  if (!password) return false;
  try {
    const a = Buffer.from(input);
    const b = Buffer.from(password);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Rate limiter for /signin
// ─────────────────────────────────────────────────────────────────────────
// In-memory, per-Vercel-function-instance. Not perfect across instances but
// fine for an admin gate at our scale. If we ever need cross-instance
// rate limiting, swap this for Upstash + @upstash/ratelimit.
//
// Policy: max 5 failed attempts per IP per 10-minute rolling window.

interface Attempt {
  count: number;
  firstAt: number;
}

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Read-only: is this IP currently allowed to attempt a login? */
export function checkLoginRate(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.firstAt > WINDOW_MS) return { allowed: true };
  if (a.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - a.firstAt)) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
}

/** Increment the fail counter for this IP. Resets the window if expired. */
export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now });
  } else {
    a.count++;
  }
}

/** Successful login → wipe the failure count for this IP. */
export function resetLoginAttempts(ip: string): void {
  attempts.delete(ip);
}
