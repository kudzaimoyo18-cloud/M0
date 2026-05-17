import { redirect } from "next/navigation";
import { checkPassword, isAdmin, setAdminCookie } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { error, next } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const pw = String(formData.get("password") ?? "");
    if (!checkPassword(pw)) {
      redirect("/admin/login?error=1");
    }
    await setAdminCookie(pw);
    redirect(next || "/admin");
  }

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
            className="input-underline"
          />
        </label>
        {error && <p role="alert" className="text-danger text-[14px] mt-3">Incorrect password.</p>}
        <button type="submit" className="btn-primary mt-6">Sign in</button>
      </form>
    </div>
  );
}
