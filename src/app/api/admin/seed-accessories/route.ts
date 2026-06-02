import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/db";

/**
 * Additive accessories seed.
 *
 *   POST /api/admin/seed-accessories
 *
 * Admin-cookie gated. Adds 13 accessory products (sunglasses, bags, slides)
 * to the existing catalog without wiping anything. Idempotent — re-running
 * skips products whose slug already exists.
 *
 *   Sunglasses (9) → women, USD 50, one size
 *   Bags (2)       → women, USD 180, one size
 *   Slides (2)     → men,   USD 65,  sizes 40-44
 *
 * Hero photos live under /public/seed/accessories/ and are served directly
 * by Vercel.
 *
 * Where the same model ships in two colorways (e.g. Loewe gold-square in
 * brown vs dark lens), they're listed as ONE product and the description
 * mentions both options — customer picks the variant in the WhatsApp thread
 * that opens at checkout.
 */

const NO_STORE = "private, no-store, no-cache, must-revalidate";

interface AccessorySpec {
  /** Public-facing product name */
  name: string;
  /** Supplier catalogue code, e.g. "8064-1". Appended to description. */
  code?: string;
  /** Path under /public/ */
  image: string;
  /** Long description shown on PDP */
  description: string;
  /** women | men */
  categoryId: "women" | "men";
  /** USD price in dollars (multiplied by 100 for storage) */
  priceUsd: number;
  /** Variants available — one-size for eyewear/bags, multiple sizes for slides */
  sizes: readonly string[];
  /** Per-variant stock count */
  stock: number;
  /** Mark on the homepage New In grid */
  featured: boolean;
}

const ONE_SIZE = ["One Size"] as const;
const SLIDE_SIZES = ["40", "41", "42", "43", "44"] as const;

const ACCESSORIES: AccessorySpec[] = [
  // ── Sunglasses ──────────────────────────────────────────────────────
  {
    name: "Tortoise Cat-Eye Sunglasses",
    code: "8064-1",
    image: "/seed/accessories/tortoise-cat-eye-sunglasses.jpg",
    description:
      "Acetate cat-eye frames in mottled tortoise. Gradient grey lenses. Slim arms with a subtle T-detail at the temple. Ships with branded box, cloth pouch, and authenticity card.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: true,
  },
  {
    name: "Round Rimless Sunglasses",
    code: "008-3",
    image: "/seed/accessories/round-rimless-sunglasses.jpg",
    description:
      "Rimless oval lenses with a slim gold bridge and faceted black temples. Lightweight all-day fit. Ships with branded box and cloth.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: true,
  },
  {
    name: "Shield Sunglasses — Ivory",
    code: "8021-1",
    image: "/seed/accessories/shield-ivory-sunglasses.jpg",
    description:
      "Single-lens shield with gradient tint, gold logo lettering, and contrast ivory temples. Bold, modern silhouette. Ships with branded box, cloth, and tags.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: false,
  },
  {
    name: "Gold Aviator Sunglasses",
    code: "9008-2",
    image: "/seed/accessories/gold-aviator-sunglasses.jpg",
    description:
      "Squared aviator in polished gold metal with a double bridge and dark grey lenses. Slim arms with engraved temple detail. Ships with branded box and cloth.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: false,
  },
  {
    name: "Hexagon Tortoise Sunglasses",
    code: "6016-1",
    image: "/seed/accessories/hexagon-tortoise-sunglasses.jpg",
    description:
      "Six-sided acetate frames in honey tortoise with brown gradient lenses. Gold-tone monogram lettering at the temple. Ships with branded box, cloth, and authenticity card.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: false,
  },
  {
    name: "Gold Square Sunglasses",
    code: "9049 (brown or dark lens)",
    image: "/seed/accessories/gold-square-sunglasses.jpg",
    description:
      "Slim gold-metal square frames with brown gradient lenses. Engraved logo detail at the temple. Available in brown lens or smoke-dark lens — confirm your choice in the WhatsApp thread at checkout. Ships with branded box and cloth.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: false,
  },
  {
    name: "Rimless Shield Sunglasses",
    code: "8022-2",
    image: "/seed/accessories/rimless-shield-sunglasses.jpg",
    description:
      "Rimless wraparound shield in a smoky gradient. Black acetate temples with gold geometric inlay. Ships with branded box, cloth, and tag.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: false,
  },
  {
    name: "Rimless Crystal-Detail Sunglasses",
    code: "8074-2",
    image: "/seed/accessories/rimless-crystal-sunglasses.jpg",
    description:
      "Rimless rectangular sunglasses with a crystallised gold medallion at the temple. Subtle baroque hardware. Ships with branded box, cloth, and authenticity tag.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: false,
  },
  {
    name: "Brown Rectangle Sunglasses",
    code: "6025-1",
    image: "/seed/accessories/brown-rectangle-sunglasses.jpg",
    description:
      "Chunky tinted-brown acetate frames in a clean rectangle. Brown gradient lenses, gold logo lettering and triomphe-style hardware at the temple. Ships with branded box and cloth.",
    categoryId: "women",
    priceUsd: 50,
    sizes: ONE_SIZE,
    stock: 5,
    featured: true,
  },

  // ── Bags ────────────────────────────────────────────────────────────
  {
    name: "Top-Handle Leather Tote — Grey",
    image: "/seed/accessories/top-handle-tote-grey.jpg",
    description:
      "Structured pebble-leather top-handle tote in elephant grey. Detachable shoulder strap, polished gold turn-lock, fully lined interior. Comes with dust bag, clochette, and padlock.",
    categoryId: "women",
    priceUsd: 180,
    sizes: ONE_SIZE,
    stock: 5,
    featured: true,
  },
  {
    name: "Quilted Chain Shoulder Bag — Brown",
    image: "/seed/accessories/quilted-chain-bag-brown.jpg",
    description:
      "Diamond-quilted soft leather flap bag in chocolate brown. Aged gold chain-and-leather strap, sculpted C clasp at the front. Magnetic flap, interior slip pocket.",
    categoryId: "women",
    priceUsd: 180,
    sizes: ONE_SIZE,
    stock: 5,
    featured: true,
  },

  // ── Slides (men) ────────────────────────────────────────────────────
  {
    name: "Leather Logo Slides",
    image: "/seed/accessories/leather-logo-slides.jpg",
    description:
      "Soft pebble-leather slides with an oversized embossed logo strap and contoured footbed. Lightweight rubber sole. Available in chocolate brown or black — confirm your choice in the WhatsApp thread at checkout.",
    categoryId: "men",
    priceUsd: 65,
    sizes: SLIDE_SIZES,
    stock: 5,
    featured: true,
  },
  {
    name: "Criss-Cross Leather Slides",
    image: "/seed/accessories/criss-cross-slides.jpg",
    description:
      "Two-band slip-on slides with crossed leather-and-canvas straps over a moulded cushioned footbed. Available in all-black or tan-and-black — confirm your choice in the WhatsApp thread at checkout.",
    categoryId: "men",
    priceUsd: 65,
    sizes: SLIDE_SIZES,
    stock: 5,
    featured: false,
  },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildDescription(spec: AccessorySpec): string {
  if (!spec.code) return spec.description;
  return `${spec.description}\n\nStyle: ${spec.code}`;
}

async function seed() {
  const db = await getDb();

  // Build everything in memory first.
  const products: (typeof schema.products.$inferInsert)[] = [];
  const variants: (typeof schema.variants.$inferInsert)[] = [];
  const images: (typeof schema.productImages.$inferInsert)[] = [];

  for (const spec of ACCESSORIES) {
    const productId = crypto.randomUUID();
    const slug = slugify(spec.name);

    products.push({
      id: productId,
      slug,
      name: spec.name,
      description: buildDescription(spec),
      categoryId: spec.categoryId,
      priceUsdMinor: spec.priceUsd * 100,
      status: "active",
      featured: spec.featured,
    });

    for (const size of spec.sizes) {
      variants.push({
        id: crypto.randomUUID(),
        productId,
        sku: `${slug}-${slugify(size)}`,
        size,
        inventory: spec.stock,
      });
    }

    images.push({
      id: crypto.randomUUID(),
      productId,
      url: spec.image,
      blobPath: `public${spec.image}`,
      alt: spec.name,
      position: 0,
    });
  }

  // Skip products whose slug is already in the DB. We can't rely on
  // onConflictDoNothing alone — variants + images carry foreign keys to the
  // newly-generated product UUIDs, which won't exist if the parent insert
  // gets skipped. Filter the inserts to match what's actually new.
  const candidateSlugs = products.map((p) => p.slug);
  const existing = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(inArray(schema.products.slug, candidateSlugs));
  const existingSlugs = new Set(existing.map((r) => r.slug));

  const newProducts = products.filter((p) => !existingSlugs.has(p.slug));
  const newProductIds = new Set(newProducts.map((p) => p.id));
  const newVariants = variants.filter((v) => newProductIds.has(v.productId));
  const newImages = images.filter((i) => newProductIds.has(i.productId));

  if (newProducts.length > 0) {
    // neon-http driver doesn't support transactions, so the three inserts
    // run sequentially. If variants or images fail mid-batch the route can
    // be safely re-POSTed — the slug pre-check skips already-inserted
    // products, and the variants/images filter follows.
    await db.insert(schema.products).values(newProducts);
    if (newVariants.length > 0) await db.insert(schema.variants).values(newVariants);
    if (newImages.length > 0) await db.insert(schema.productImages).values(newImages);
  }

  return {
    added: newProducts.length,
    skipped: existingSlugs.size,
    variants: newVariants.length,
    images: newImages.length,
    featured: newProducts.filter((p) => p.featured).length,
  };
}

export async function POST() {
  if (!(await isAdmin())) {
    const res = NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }
  try {
    const counts = await seed();
    const res = NextResponse.json({ ok: true, counts });
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "seed failed" },
      { status: 500 }
    );
    res.headers.set("Cache-Control", NO_STORE);
    return res;
  }
}

// Explicit 405 on GET — destructive endpoints should never be reachable via
// cross-origin GET probes. Same posture as /api/admin/seed.
export function GET(_req: NextRequest) {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": NO_STORE },
  });
}
