import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Cinzel } from "next/font/google";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { CartProvider } from "@/components/providers/cart-provider";
import { WishlistProvider } from "@/components/providers/wishlist-provider";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Roman inscriptional capitals — used only for the M0 wordmark.
const wordmark = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-wordmark",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "M0",
    template: "%s — M0",
  },
  description: "M0 — modern wardrobe essentials.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${wordmark.variable}`}>
      <body>
        <CurrencyProvider>
          <CartProvider>
            <WishlistProvider>
              <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-ink-900 focus:text-paper focus:px-3 focus:py-2 focus:label">
                Skip to content
              </a>
              <Header />
              <main id="main">{children}</main>
              <Footer />
            </WishlistProvider>
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
