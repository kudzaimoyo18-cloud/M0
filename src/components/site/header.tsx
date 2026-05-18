"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Search, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { CurrencySwitcher } from "@/components/site/currency-switcher";
import { cn } from "@/lib/utils";

const NAV: { label: string; href: string }[] = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "New", href: "/new" },
  { label: "Editorial", href: "/editorial" },
];

export function Header() {
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className={cn("sticky top-0 z-40 bg-paper transition-colors duration-base ease-std", scrolled && "border-b border-ink-300")}>
      <div className="h-14 md:h-[72px] grid grid-cols-3 items-center px-4 md:px-8">
        <div className="flex items-center gap-6">
          <button type="button" aria-label="Open menu" className="md:hidden -ml-2 p-2" onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" strokeWidth={1.25} />
          </button>
          <nav className="hidden md:flex items-center gap-6 label">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:opacity-70 transition-opacity duration-fast">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex justify-center">
          <Link href="/" className="font-wordmark font-semibold text-[22px] md:text-[26px] tracking-[0.18em]">
            M0
          </Link>
        </div>

        <div className="flex items-center justify-end gap-4 md:gap-5">
          <button type="button" aria-label="Search" className="p-1 hover:opacity-70">
            <Search className="h-5 w-5" strokeWidth={1.25} />
          </button>
          <Link href="/wishlist" aria-label="Wishlist" className="p-1 hover:opacity-70">
            <Heart className="h-5 w-5" strokeWidth={1.25} />
          </Link>
          <Link href="/cart" aria-label={`Bag (${count} items)`} className="p-1 hover:opacity-70 relative">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.25} />
            {count > 0 && (
              <span className="absolute -bottom-1 -right-1 caption tabular bg-ink-900 text-paper min-w-[16px] h-[16px] inline-flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-paper flex flex-col">
          <div className="h-14 grid grid-cols-3 items-center px-4 border-b border-ink-300">
            <div />
            <div className="flex justify-center font-wordmark font-semibold text-[22px] tracking-[0.18em]">M0</div>
            <div className="flex justify-end">
              <button type="button" aria-label="Close menu" className="-mr-2 p-2" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" strokeWidth={1.25} />
              </button>
            </div>
          </div>
          <nav className="flex-1 flex flex-col px-6 py-8 gap-6 font-display text-section">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-6 py-6 border-t border-ink-300 flex items-center justify-between">
            <CurrencySwitcher />
            <Link href="/track" className="label" onClick={() => setMenuOpen(false)}>
              Track order
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
