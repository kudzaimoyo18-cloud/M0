import Link from "next/link";
import { CurrencySwitcher } from "@/components/site/currency-switcher";
import { WhatsAppContact } from "@/components/site/whatsapp-contact";

const COLS = [
  {
    heading: "Help",
    links: [
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "Sizing", href: "/help/sizing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Stores", href: "/stores" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Cookies", href: "/legal/cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink-900 text-paper mt-section">
      <div className="px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="font-wordmark font-semibold text-[32px] tracking-[0.18em]">M0</div>
          <p className="mt-4 text-ink-300 max-w-measure" style={{ fontSize: "13px" }}>
            Modern wardrobe essentials. Designed in Harare. Shipped across Zimbabwe.
          </p>
          <div className="mt-6">
            <WhatsAppContact />
          </div>
        </div>
        {COLS.map((col) => (
          <div key={col.heading}>
            <h3 className="label text-paper">{col.heading}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-300 hover:text-paper transition-colors duration-fast" style={{ fontSize: "13px" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="px-4 md:px-8 py-6 border-t border-ink-700 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <form className="flex items-end gap-3 max-w-sm w-full">
          <div className="flex-1">
            <label className="label text-ink-300 block mb-2" htmlFor="newsletter">
              Join the list.
            </label>
            <input
              id="newsletter"
              type="email"
              placeholder="Email address"
              className="w-full bg-transparent border-0 border-b border-ink-700 px-0 py-2 text-paper placeholder:text-ink-500 focus:border-paper focus:outline-none focus:ring-0 transition-colors duration-fast"
            />
          </div>
          <button type="submit" className="label text-paper border-b border-paper pb-1">
            Subscribe
          </button>
        </form>
        <div className="flex items-center gap-6">
          <CurrencySwitcher dark />
          <p className="caption text-ink-500">© {new Date().getFullYear()} M0</p>
        </div>
      </div>
    </footer>
  );
}
