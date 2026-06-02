import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  checkLoginRate,
  checkPassword,
  isAdmin,
  recordFailedLogin,
  resetLoginAttempts,
  setAdminCookie,
} from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; retry?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { error, next, retry } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const h = await headers();
    // Prefer x-vercel-forwarded-for — see middleware.ts for the spoofing
    // rationale. Same header strategy keeps the rate-limit key consistent
    // between middleware and the sign-in action.
    const ip =
      (h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? "")
        .split(",")[0]
        .trim() || "unknown";

    const rl = checkLoginRate(ip);
    if (!rl.allowed) {
      redirect(`/signin?error=throttled&retry=${rl.retryAfter ?? 600}`);
    }

    const pw = String(formData.get("password") ?? "");
    if (!checkPassword(pw)) {
      recordFailedLogin(ip);
      redirect("/signin?error=1");
    }
    resetLoginAttempts(ip);
    await setAdminCookie(pw);
    // Open-redirect guard: only honor `next` if it points back into this
    // app (starts with "/", not "//" which would resolve to a foreign host).
    const safeNext =
      typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/admin";
    redirect(safeNext);
  }

  const throttled = error === "throttled";
  const retrySeconds = Number(retry) || 0;

  return (
    <div className="min-h-[70svh] flex items-center justify-center px-4">
      <form action={signIn} className="w-full max-w-xs">
        <h1 className="font-display text-section text-center">Admin</h1>
        <p className="caption text-ink-500 text-center mt-2">Sign in to manage products and orders.</p>
        <label className="block mt-8">
          <span className="label block mb-2">Password</span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            disabled={throttled}
            className="input-underline"
          />
        </label>
        {error === "1" && <p role="alert" className="text-danger text-[14px] mt-3">Incorrect password.</p>}
        {throttled && (
          <p role="alert" className="text-danger text-[14px] mt-3">
            Too many attempts. Try again in {Math.ceil(retrySeconds / 60)} minute{retrySeconds >= 120 ? "s" : ""}.
          </p>
        )}
        <button type="submit" disabled={throttled} className="btn-primary mt-6">
          Sign in
        </button>
        <p className="caption text-ink-500 mt-8 text-center">
          You will stay signed in for 24 hours on this device.
        </p>
      </form>
    </div>
  );
}
