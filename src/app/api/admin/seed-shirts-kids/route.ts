import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/db";

/**
 * Additive seed for the men's shirts batch and the new kids' line.
 *
 *   POST /api/admin/seed-shirts-kids
 *
 * Admin-cookie gated. Adds:
 *
 *   Shirts (4) → men,  USD 45, sizes M/L/XL/XXL, stock 3 each
 *   Kids   (9) → kids, USD 45 for co-ord sets, USD 70 for ball-gowns/dresses
 *                      age-range variant (4-7 Years or 8-12 Years), stock 5
 *
 * Adds the "kids" row to the categories table on first run (idempotent via
 * onConflictDoNothing). Existing categories untouched.
 *
 * Sequential inserts — the neon-http driver doesn't support transactions.
 * Idempotent: re-running skips products whose slug already exists, so a
 * partial failure during inserts is recoverable by re-POSTing.
 */

const NO_STORE = "private, no-store, no-cache, must-revalidate";

interface ProductSpec {
  /** Public-facing product name */
  name: string;
  /** Optional supplier catalogue code, appended to description */
  code?: string;
  /** Path under /public/ */
  image: string;
  /** Long description shown on PDP */
  description: string;
  /** women | men | kids */
  categoryId: "women" | "men" | "kids";
  /** USD price in dollars (× 100 for storage) */
  priceUsd: number;
  /** Variant labels — size letters for adults, age ranges for kids */
  sizes: readonly string[];
  /** Per-variant stock */
  stock: number;
  /** Mark on the homepage New In grid */
  featured: boolean;
}

const SHIRT_SIZES = ["M", "L", "XL", "XXL"] as const;
const KIDS_4_7 = ["4-7 Years"] as const;
const KIDS_8_12 = ["8-12 Years"] as const;

const SHIRTS: ProductSpec[] = [
  {
    name: "Black Smart Shirt",
    code: "AY-372",
    image: "/seed/shirts/black-smart-shirt.jpg",
    description:
      "Slim-fit cotton button-down in clean black. Spread collar, single chest pocket, mother-of-pearl buttons. Throws on under a jacket or wears solo with chinos.",
    categoryId: "men",
    priceUsd: 45,
    sizes: SHIRT_SIZES,
    stock: 3,
    featured: true,
  },
  {
    name: "Charcoal Check Smart Shirt",
    image: "/seed/shirts/charcoal-check-shirt.jpg",
    description:
      "Subtle windowpane check on a charcoal cotton base. Slim fit, spread collar, single chest pocket. Quiet enough for the office, sharp enough for an evening out.",
    categoryId: "men",
    priceUsd: 45,
    sizes: SHIRT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Mauve Smart Shirt",
    code: "AY-372",
    image: "/seed/shirts/mauve-smart-shirt.jpg",
    description:
      "Soft dusty-mauve cotton button-down. Slim cut through the waist, spread collar. The unexpected colour in a wardrobe of blues and whites.",
    categoryId: "men",
    priceUsd: 45,
    sizes: SHIRT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Pink Smart Shirt",
    code: "AY-372",
    image: "/seed/shirts/pink-smart-shirt.jpg",
    description:
      "Classic powder-pink cotton shirt in a slim fit. Spread collar, mother-of-pearl buttons. Pairs as easily with navy chinos as with grey wool trousers.",
    categoryId: "men",
    priceUsd: 45,
    sizes: SHIRT_SIZES,
    stock: 3,
    featured: false,
  },
];

const KIDS: ProductSpec[] = [
  // Co-ord sets — USD 45
  {
    name: "Cream Bow Cardigan Set",
    image: "/seed/kids/cream-bow-cardigan-set.jpg",
    description:
      "Two-piece: short-sleeve cream cardigan with a contrast black bow at the neck and a matching pleated skirt with black hem band. Tweed-feel cotton blend.",
    categoryId: "kids",
    priceUsd: 45,
    sizes: KIDS_8_12,
    stock: 5,
    featured: true,
  },
  {
    name: "Cream Tweed Cardigan Set",
    image: "/seed/kids/cream-tweed-cardigan-set.jpg",
    description:
      "Two-piece: cropped tweed cardigan with mother-of-pearl buttons and a matching mini-pleated skirt. Soft, structured, school-special.",
    categoryId: "kids",
    priceUsd: 45,
    sizes: KIDS_8_12,
    stock: 5,
    featured: false,
  },
  {
    name: "Blue Floral Cardigan Set",
    image: "/seed/kids/blue-floral-cardigan-set.jpg",
    description:
      "Two-piece in soft sky blue with raised cream floral pattern: short-puff-sleeve cardigan plus pleated mini skirt. Cotton-blend, fully lined skirt.",
    categoryId: "kids",
    priceUsd: 45,
    sizes: KIDS_8_12,
    stock: 5,
    featured: true,
  },

  // Party dresses / ball gowns — USD 70
  {
    name: "Pink Ruffle Tulle Dress",
    image: "/seed/kids/pink-ruffle-tulle-dress.jpg",
    description:
      "Sleeveless party dress in soft pink. Ruffled tulle layers, satin sash at the waist, scattered floral appliqué. Lined bodice, hidden back zip.",
    categoryId: "kids",
    priceUsd: 70,
    sizes: KIDS_4_7,
    stock: 5,
    featured: true,
  },
  {
    name: "Navy Princess Ballgown",
    image: "/seed/kids/navy-princess-ballgown.jpg",
    description:
      "Off-the-shoulder ballgown in deep navy with a fitted bodice, ruffled neckline, and double-layer tulle skirt. Beaded floral detail at the waist. Tiara not included.",
    categoryId: "kids",
    priceUsd: 70,
    sizes: KIDS_4_7,
    stock: 5,
    featured: true,
  },
  {
    name: "Cream Pearl Ballgown",
    image: "/seed/kids/cream-pearl-ballgown.jpg",
    description:
      "Cap-sleeve ballgown in ivory cream. Pearl-beaded bodice, full satin and tulle skirt. Hidden back zip, fully lined.",
    categoryId: "kids",
    priceUsd: 70,
    sizes: KIDS_4_7,
    stock: 5,
    featured: false,
  },
  {
    name: "Dusty Rose Lace Ballgown",
    image: "/seed/kids/dusty-rose-lace-ballgown.jpg",
    description:
      "Lace-bodice ballgown in dusty rose with a large satin bow at the back, scalloped lace hem, and double tulle skirt. Fully lined, hidden back zip.",
    categoryId: "kids",
    priceUsd: 70,
    sizes: KIDS_4_7,
    stock: 5,
    featured: false,
  },
  {
    name: "Cream Embroidered Floral Dress",
    image: "/seed/kids/cream-embroidered-floral-dress.jpg",
    description:
      "Tea-length party dress in ivory with green floral embroidery on tulle, peter-pan collar, and puff sleeves. Cinched waist, hidden back zip.",
    categoryId: "kids",
    priceUsd: 70,
    sizes: KIDS_4_7,
    stock: 5,
    featured: false,
  },
  {
    name: "Pink Princess Ballgown",
    image: "/seed/kids/pink-princess-ballgown.jpg",
    description:
      "Off-the-shoulder ballgown in soft pink with a fitted beaded bodice and tiered tulle skirt. Made for birthdays, recitals, and weddings.",
    categoryId: "kids",
    priceUsd: 70,
    sizes: KIDS_8_12,
    stock: 5,
    featured: false,
  },
];

const ALL_PRODUCTS = [...SHIRTS, ...KIDS];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildDescription(spec: ProductSpec): string {
  if (!spec.code) return spec.description;
  return `${spec.description}\n\nStyle: ${spec.code}`;
}

async function seed() {
  const db = await getDb();

  // Ensure the kids category exists. Existing categories (women, men) are
  // left untouched by onConflictDoNothing.
  await db
    .insert(schema.categories)
    .values({ id: "kids", name: "Kids", position: 3 })
    .onConflictDoNothing();

  const products: (typeof schema.products.$inferInsert)[] = [];
  const variants: (typeof schema.variants.$inferInsert)[] = [];
  const images: (typeof schema.productImages.$inferInsert)[] = [];

  for (const spec of ALL_PRODUCTS) {
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

  // Skip products whose slug already exists. Variants + images carry FKs to
  // newly-generated product UUIDs, so we filter those to match.
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
    // Sequential — neon-http doesn't support transactions. See
    // /api/admin/seed-accessories for the same posture.
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

export function GET(_req: NextRequest) {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": NO_STORE },
  });
}
