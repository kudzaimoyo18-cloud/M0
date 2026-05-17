import type { Config } from "tailwindcss";

/**
 * M0 — strict editorial. Tokens mirror design-system/MASTER.md §2-§7.
 * Do not add accent colors here without updating MASTER.md first.
 */
export default {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#000000",
          700: "#1A1A1A",
          500: "#737373",
          300: "#BFBFBF",
          100: "#F4F4F4",
        },
        paper: "#FFFFFF",
        ok: "#0F7B3A",
        warn: "#B45309",
        danger: "#B91C1C",
      },
      fontFamily: {
        // Loaded via next/font in layout.tsx; CSS vars set on <html>.
        display: ["var(--font-display)", "Cormorant Garamond", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Custom scale per MASTER §3
        display: ["clamp(44px, 6vw, 72px)", { lineHeight: "1.05", letterSpacing: "-0.01em" }],
        section: ["clamp(24px, 3vw, 32px)", { lineHeight: "1.1", letterSpacing: "-0.005em" }],
        label: ["12px", { lineHeight: "1.2", letterSpacing: "0.12em" }],
        caption: ["11px", { lineHeight: "1.3", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        none: "0",
        DEFAULT: "0",
      },
      spacing: {
        // 8pt grid; Tailwind defaults are 4pt so no override needed,
        // but expose semantic aliases for readability.
        gutter: "1rem",
        section: "4rem",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        std: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      maxWidth: {
        measure: "65ch",
      },
      aspectRatio: {
        product: "3 / 4",
      },
    },
  },
  plugins: [],
} satisfies Config;
