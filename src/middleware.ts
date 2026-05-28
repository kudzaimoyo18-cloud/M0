import { NextRequest, NextResponse } from "next/server";

/**
 * Admin gate.
 *
 * Protects /admin/* except /admin/login. If the m0_admin cookie is missing or
 * doesn't match ADMIN_PASSWORD, the user is redirected to /admin/login.
 *
 * We can't constant-time-compare in the Edge runtime (no node:crypto) so the
 * full equality check happens server-side in `lib/admin.ts` for routes that
 * actually need it; the middleware does only a "cookie present + matches" gate.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const expected = process.env.ADMIN_PASSWORD ?? "";
  const provided = req.cookies.get("m0_admin")?.value ?? "";
  if (!expected || provided !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // `/admin/:path*` only matches paths with at least one segment after
  // /admin (e.g. /admin/products). The bare /admin URL slips through and
  // the dashboard renders unauthenticated. List both explicitly.
  matcher: ["/admin", "/admin/:path*"],
};
