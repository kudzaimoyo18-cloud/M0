import { NextRequest, NextResponse } from "next/server";

/**
 * Admin gate. Runs on every /admin and /admin/* request.
 *
 * Three layers, in order:
 *   1. Optional IP allowlist  — if ADMIN_IP_ALLOWLIST is set, only those
 *      x-forwarded-for client IPs are even allowed to attempt sign-in.
 *   2. Cookie + password check — m0_admin cookie must equal ADMIN_PASSWORD.
 *   3. Cache-Control headers   — every admin response is uncacheable so the
 *      browser BFCache / disk cache can't show a stale dashboard after
 *      sign-out.
 *
 * Defense in depth: src/app/admin/layout.tsx also calls requireAdmin() on
 * every render, so a misconfigured matcher can't expose the dashboard.
 */

const NO_STORE = "private, no-store, no-cache, must-revalidate";

function ipFrom(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || "unknown";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Optional IP allowlist ─────────────────────────────────────────
  const allowlist = (process.env.ADMIN_IP_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length > 0) {
    const ip = ipFrom(req);
    if (!allowlist.includes(ip)) {
      const res = new NextResponse("Forbidden", { status: 403 });
      res.headers.set("Cache-Control", NO_STORE);
      return res;
    }
  }

  // ── 2. Cookie + password check ───────────────────────────────────────
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const provided = req.cookies.get("m0_admin")?.value ?? "";
  if (!expected || provided !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }

  // ── 3. Authenticated — pass through with no-store headers ────────────
  const res = NextResponse.next();
  res.headers.set("Cache-Control", NO_STORE);
  return res;
}

export const config = {
  // Match both the bare /admin and any subpath. /admin/:path* alone misses
  // the bare URL because :path* needs at least one segment.
  matcher: ["/admin", "/admin/:path*"],
};
