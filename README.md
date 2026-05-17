# M0

> Modern wardrobe essentials. Designed in Harare, shipped across Zimbabwe.

Strict editorial e-commerce inspired by Zara's simplicity. Pure black-and-white, full-bleed imagery, sharp corners. Deployed on Vercel.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS + custom tokens (`design-system/MASTER.md`) |
| Database | Neon Postgres (via Vercel Storage integration) + Drizzle ORM |
| Images | Vercel Blob |
| Auth | None — shared password gate on `/admin` |
| Checkout | WhatsApp + cash on delivery (no online payment in v1) |
| FX | Live USD→ZWG rates from `open.er-api.com` (fallback table) |
| Hosting | Vercel |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Provision Neon + Blob on Vercel
#    a. Push this repo to GitHub.
#    b. Create a Vercel project from the repo.
#    c. In Vercel: Storage → Connect Database → Neon → Create. Vercel sets DATABASE_URL.
#    d. In Vercel: Storage → Connect Database → Blob → Create. Vercel sets BLOB_READ_WRITE_TOKEN.

# 3. Pull env vars locally
npx vercel link            # link this folder to the Vercel project
npx vercel env pull .env.local

# 4. Apply the schema to Neon
psql "$DATABASE_URL" -f drizzle/0000_init.sql
# OR via Drizzle Kit:
npm run db:push

# 5. Dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/admin/login`, enter the `ADMIN_PASSWORD` from `.env.local`.

---

## Env vars

| Name | Where set | Used by |
|---|---|---|
| `DATABASE_URL` | Vercel → Storage → Neon (auto) | Drizzle / Neon serverless client |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob (auto) | `/api/admin/upload`, `lib/blob.ts` |
| `ADMIN_PASSWORD` | Vercel → Settings → Environment Variables (manual) | `/admin/login`, `requireAdmin()` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Manual | Checkout CTA, footer, WhatsApp message builder |
| `NEXT_PUBLIC_SITE_URL` | Manual (e.g. `https://m0.shop`) | Metadata, absolute URLs in WhatsApp messages |
| `FX_API_URL` | Optional, default works | `/api/fx` + `lib/currency.ts` |

---

## Project layout

```
m0/
├── design-system/
│   ├── MASTER.md            ← Source of truth for tokens, type, motion, copy.
│   └── pages/               ← Page-level overrides
├── drizzle/
│   └── 0000_init.sql        ← Postgres migration
├── src/
│   ├── app/
│   │   ├── (storefront)     ← Home, [category], product/[slug], cart, checkout, track, wishlist
│   │   ├── admin/           ← Login, dashboard, products CRUD, orders viewer
│   │   └── api/
│   │       ├── checkout/    ← Saves COD order → returns wa.me deep link
│   │       ├── admin/upload/← Vercel Blob upload (admin-only)
│   │       └── fx/          ← Cached FX rates
│   ├── components/
│   │   ├── providers/       ← Currency + Cart contexts (client, localStorage-backed)
│   │   └── site/            ← Header, Footer, ProductCard, Price, CurrencySwitcher, WhatsAppContact
│   ├── db/                  ← Drizzle Postgres schema + Neon client
│   ├── lib/
│   │   ├── whatsapp.ts      ← wa.me URL + order message builder
│   │   ├── currency.ts      ← FX + Intl formatting
│   │   ├── blob.ts          ← Vercel Blob put/delete
│   │   ├── admin.ts         ← Shared-password cookie gate
│   │   └── utils.ts
├── next.config.ts
├── vercel.json
├── tailwind.config.ts
└── package.json
```

---

## Design system

`design-system/MASTER.md` is the **single source of truth**. Before touching tokens or component primitives, read it.

Key rules:
- **No color** outside `--ok / --warn / --danger` form states.
- **No border radius.** Anywhere.
- **No shadows.** Elevation is white-on-white with hairline borders.
- **Type:** Cormorant Garamond (display) + Inter (UI). Buttons/nav use UPPERCASE label style with 0.12em tracking.
- **Motion:** crossfade only, 150–320ms, ease-in-out. Respect `prefers-reduced-motion`.

---

## Checkout — WhatsApp + cash on delivery

v1 does not take online payments. Checkout writes a `pending` order to Postgres with `payment_provider = "whatsapp_cod"` and opens a `wa.me` deep link with a prefilled order summary. Settlement happens at delivery.

When a card / mobile-money integration goes in later, swap `src/lib/whatsapp.ts` for a real provider and bump `payment_provider`.

---

## Currency

Prices are stored in **USD cents**. The checkout snapshots the chosen-currency total + the FX rate on each order so totals reconcile if rates move before delivery.

- Live rates: set `FX_API_URL=https://open.er-api.com/v6/latest/USD` (free, no key).
- Fallback: `src/lib/currency.ts` ships a conservative `{ ZWG: 26 }`.

---

## Admin

Single shared password. Set `ADMIN_PASSWORD` in env. On `/admin/login`, the password gets dropped into a 14-day httpOnly cookie. Rotate by updating the env var and redeploying.

---

## Deploy

```bash
# One-time
npx vercel
# follow prompts to link/create a Vercel project

# Deploy a preview
npx vercel
# Deploy to production
npx vercel --prod
```

Or just push to the linked GitHub repo — Vercel auto-deploys.

---

## Outstanding TODOs (v1+)

- Wishlist heart-toggle on PLP / PDP (page exists, just needs the buttons wired).
- Real product search (header search icon is a stub).
- Email order confirmations (Resend).
- Inventory decrement when admin marks an order `paid`.
- Sitemap + robots + OG images.
- Online payments (Paynow Express, Stripe) when volume justifies it.
