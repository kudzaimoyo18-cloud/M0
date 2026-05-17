# M0 — Design System (MASTER)

> Source of truth. Page-specific overrides live in `design-system/pages/<page>.md`.
> Derived from ui-ux-pro-max rule library + brand brief: **strict editorial, Zara-like simplicity, full-bleed imagery, no color, sharp corners**.

---

## 1. Brand posture

| | |
|---|---|
| Name | **M0** |
| Category | Fashion / apparel (multi-category capable) |
| Market | Zimbabwe (USD primary, ZWG optional) |
| Voice | Editorial. Confident. No exclamation marks. No emoji. Sentences are short. |
| Anti-voice | Friendly mall-store copy, "Shop now!", playful microcopy, hype language |

---

## 2. Color tokens

Pure monochrome. No accent color. Status colors exist only inside admin forms and error messages.

```ts
// Storefront — public
--ink-900: #000000;   // Primary text, primary CTA bg, borders
--ink-700: #1A1A1A;   // Body text alt (rare)
--ink-500: #737373;   // Muted text, captions, secondary labels
--ink-300: #BFBFBF;   // Disabled, hairlines
--ink-100: #F4F4F4;   // Surface, hover wash, skeleton
--paper:   #FFFFFF;   // Background

// Status — only inside forms / admin
--ok:      #0F7B3A;
--warn:    #B45309;
--danger:  #B91C1C;
```

**Rules**
- `color-not-only` — never convey meaning by color alone (Wishlist heart uses fill state + label; sale tag uses strikethrough, not red).
- `color-accessible-pairs` — ink-500 on paper = 4.69:1 ✓ AA. ink-300 only on borders, never on text.
- Dark mode: **not in v1**. Strict editorial loses its identity if inverted; we own that.

---

## 3. Typography

Two families. Both Google Fonts (self-hosted via Next.js `next/font` for zero CLS).

| Role | Family | Weight | Size (desktop / mobile) | Tracking | Casing |
|---|---|---|---|---|---|
| Display headline | **Cormorant Garamond** | 300 | 72px / 44px | -0.01em | none |
| Section heading | **Cormorant Garamond** | 400 | 32px / 24px | -0.005em | none |
| Brand wordmark | **Cormorant Garamond** | 500 | 24px / 20px | 0.08em | UPPERCASE |
| Body | **Inter** | 400 | 14px / 14px | 0 | none |
| Label / nav / button | **Inter** | 500 | 12px / 12px | 0.12em | UPPERCASE |
| Caption / meta | **Inter** | 400 | 11px / 11px | 0.04em | none |
| Price | **Inter** | 400 | 14px / 14px | tabular-nums | none |

**Rules**
- `font-loading` — `next/font` with `display: swap` + preconnect; reserve line-height to avoid CLS.
- `readable-font-size` — body 14px is below the 16px guideline but justified by editorial density; **inputs and PDP description stay at 16px** to avoid iOS auto-zoom.
- `weight-hierarchy` — never bold body. Hierarchy comes from family + size + spacing, not weight.
- `number-tabular` — `font-variant-numeric: tabular-nums` on every price and timer.

---

## 4. Spacing & layout

8pt grid. No exceptions outside hairline borders.

```ts
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;
```

**Container**
- No max-width on storefront pages. Content goes edge-to-edge except text blocks, which cap at `--measure: 65ch`.
- Admin pages cap at `max-w-7xl` (1280px) with centered layout.

**Breakpoints**
```
sm: 640   md: 768   lg: 1024   xl: 1280   2xl: 1536
```
Mobile-first. Hero is `100svh` on mobile, `min-h-[640px]` on desktop.

**Grid**
- PLP product grid: `grid-cols-2` mobile / `grid-cols-3` md / `grid-cols-4` lg. Gap = 1px (hairline dividers between cards, no rounded corners).
- Product image aspect ratio: **3:4** always. Photography must respect this.

---

## 5. Borders, radii, shadows

| Token | Value | Where |
|---|---|---|
| `--radius` | `0` | Everything. Sharp corners are the brand. |
| `--hairline` | `1px solid var(--ink-300)` | Card dividers, table rows, form fields |
| `--rule` | `1px solid var(--ink-900)` | Section dividers, footer top |
| Shadows | **none** | No `box-shadow` anywhere. Elevation = white on white separated by hairlines. |

`elevation-consistent` is enforced by literally having no elevation.

---

## 6. Components

### Button
Three variants only.

```
.btn-primary   → bg ink-900, text paper, h-12, w-full on mobile, w-auto px-8 on desktop
.btn-secondary → bg paper, text ink-900, border-ink-900, h-12
.btn-link      → text ink-900, underline offset-4, label style, no padding
```

- Press state: opacity 0.85, no transform.
- Disabled: opacity 0.38, cursor not-allowed.
- Loading: replace label with `…` (three dots, animated opacity).

### Input
- Underline only (`border-b` ink-300 → ink-900 on focus). No box.
- Label above input, uppercase label style.
- Error: text danger below, no red border (color-not-only).

### Product card (PLP)
- Image 3:4, full bleed.
- Below image: product name (body), price (body, right-aligned), wishlist heart (icon-only, top-right overlay on image).
- Hover (desktop only): swap to second image; **no scale, no shadow, no overlay**.

### Cart line item
- 4-col flex: image (80×107), name+meta, qty stepper, price.
- Hairline rule between rows.

### Header
- Sticky. Height 56px mobile / 72px desktop.
- Layout: hamburger / wordmark center / search + wishlist + bag right.
- Background paper, no shadow, `border-b` hairline that appears only after 8px of scroll.

### Footer
- Black background. Paper text. Three columns mobile-collapsible.
- Wordmark, newsletter input (underline only, on dark), country/currency selector.

---

## 7. Motion

Crossfade is the only transition. No bounce, no slide, no scale-up on press.

```ts
--ease: cubic-bezier(0.4, 0, 0.2, 1);   // ease-in-out standard
--dur-fast: 150ms;   // hover, focus
--dur-base: 200ms;   // image swap, modal fade
--dur-slow: 320ms;   // page transitions
```

**Rules**
- `motion-meaning` — every animation expresses a state change. Nothing decorative.
- `reduced-motion` — `@media (prefers-reduced-motion: reduce)` disables image-swap-on-hover and modal fades (modals just appear).
- `interruptible` — Framer Motion not needed; CSS transitions on `opacity` and `background-color` only.
- No animating `width`, `height`, `top`, `left`.

---

## 8. Imagery

Hard rules. Bad photos break the entire system.

| | |
|---|---|
| Aspect ratio | 3:4 (product), 16:9 or 21:9 (editorial hero) |
| Format | AVIF served via Cloudflare Image Transformations, JPEG fallback |
| Background | Neutral (paper, ink-100, or controlled outdoor) |
| Sizing | `srcset` at 320 / 640 / 960 / 1280 / 1920; `sizes` accurate per breakpoint |
| Loading | `loading="lazy"` below the fold, `priority` only on hero + PDP main image |
| Placeholder | Blur-up (`placeholder="blur"` with R2-generated thumbhash) |
| Alt text | Required. Pattern: `"<color> <product name>, <view>"` e.g. `"Black wool overcoat, front"` |

---

## 9. Accessibility (CRITICAL — must-have)

From ui-ux-pro-max §1. Every page must pass these checks.

- [ ] All text ≥4.5:1 contrast against its surface.
- [ ] Focus ring visible on every interactive element (2px ink-900 outline, 2px offset).
- [ ] Icon-only buttons (heart, hamburger, search, bag) have `aria-label`.
- [ ] Form inputs have `<label>` with `for` (not placeholder-only).
- [ ] Heading hierarchy h1 → h2 → h3, no skipping.
- [ ] Keyboard reachable: tab order matches visual order, no traps.
- [ ] `prefers-reduced-motion` respected (see §7).
- [ ] Wishlist toggle announces state via `aria-pressed`.
- [ ] Currency toggle announces selection via `aria-current`.

---

## 10. Performance budget

| Metric | Target |
|---|---|
| LCP | < 2.5s on 3G Fast (Zim baseline) |
| CLS | < 0.05 |
| INP | < 200ms |
| JS bundle (initial, gzipped) | < 90KB |
| Hero image (above-fold) | < 80KB AVIF |
| Total page weight (PDP) | < 600KB |

**Tactics**
- Server components by default. Client components only for: cart, wishlist toggle, search, currency switch, admin forms.
- `next/image` with Cloudflare loader. Never raw `<img>` for content imagery.
- No animation libraries. CSS transitions only.
- Fonts: subset to Latin, swap, preconnect.
- `Cache-Control: public, max-age=31536000, immutable` on `/cdn-cgi/image/*`.

---

## 11. Copy patterns

| Context | M0 voice | Avoid |
|---|---|---|
| Empty cart | `Your bag is empty.` | `Looks like your bag is empty! Start shopping →` |
| Add to bag CTA | `ADD` (uppercase label style) | `Add to Cart`, `Buy now!` |
| Out of stock | `Unavailable` | `Sorry, sold out :(` |
| Newsletter | `Join the list.` | `Subscribe for 10% off your first order!` |
| Sign in CTA | `SIGN IN` | `Login / Register` |
| Order confirmed | `Order received. Reference 0042.` | `Thank you for your purchase!! 🎉` |

---

## 12. Page-level override convention

When a page needs to deviate from MASTER, drop a markdown file at `design-system/pages/<page-slug>.md`. The file must declare:

```markdown
# Override — <Page>

## Inherits
- Everything in MASTER.md unless listed below.

## Overrides
- <token or rule>: <new value> — <reason>

## Reason for deviation
<one paragraph>
```

Page files always win over MASTER. If the override grows beyond a screenful, promote it to MASTER.
