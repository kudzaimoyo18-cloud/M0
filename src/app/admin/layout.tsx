import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The admin gate is enforced in middleware.ts — by the time this layout
  // renders, the request is either authenticated or on /admin/login.
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <AdminChrome />
      {children}
    </div>
  );
}

function AdminChrome() {
  return (
    <header className="flex items-baseline justify-between border-b border-ink-300 pb-4 mb-8">
      <div className="flex items-baseline gap-6">
        <h1 className="font-display text-section">M0 admin</h1>
        <nav className="flex items-center gap-6 label">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:opacity-70">{n.label}</Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-6 label">
        <Link href="/" className="underline underline-offset-4">View site</Link>
        <form action={signOut}>
          <button type="submit" className="underline underline-offset-4">Sign out</button>
        </form>
      </div>
    </header>
  );
}

async function signOut() {
  "use server";
  const { clearAdminCookie } = await import("@/lib/admin");
  await clearAdminCookie();
  const { redirect } = await import("next/navigation");
  redirect("/admin/login");
}
