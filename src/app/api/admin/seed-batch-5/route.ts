import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/db";

/**
 * Additive seed for batch 5: 14 men's shirts + 2 boys kids sets.
 *
 *   POST /api/admin/seed-batch-5
 *
 * Admin-cookie gated. Adds:
 *
 *   J&J plain AY-372 (sage, white, grey)         → men, USD 45, M/L/XL/XXL
 *   J&J patterned (AY-355, AY-269, AY-210, AY-354) → men, USD 50, M/L/XL/XXL
 *   ANTELOPUS YOUNG camp shirts (7)              → men, USD 50, M/L/XL/XXL
 *   Boys "hi" sets (palm tree 3pc, Good Vibes)   → kids, USD 55, 2-5 Years
 *
 * Sequential inserts — the neon-http driver doesn't support transactions.
 * Idempotent: re-running skips products whose slug already exists, so a
 * partial failure during inserts is recoverable by re-POSTing. Mirrors the
 * posture of /api/admin/seed-shirts-kids exactly.
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

const ADULT_SIZES = ["M", "L", "XL", "XXL"] as const;
const KIDS_2_5 = ["2-5 Years"] as const;

// J&J plain colors at AY-372 — extend the existing 4 colors with 3 more.
const JJ_PLAIN: ProductSpec[] = [
  {
    name: "Sage Smart Shirt",
    code: "AY-372",
    image: "/seed/shirts/sage-smart-shirt.jpg",
    description:
      "Slim-fit cotton button-down in soft sage. Spread collar, single chest pocket, mother-of-pearl buttons. Quiet enough for a meeting, easy enough for a weekend.",
    categoryId: "men",
    priceUsd: 45,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: true,
  },
  {
    name: "White Smart Shirt",
    code: "AY-372",
    image: "/seed/shirts/white-smart-shirt.jpg",
    description:
      "The wardrobe staple. Crisp cotton button-down in optic white. Slim fit through the waist, spread collar, mother-of-pearl buttons. Wear it with anything.",
    categoryId: "men",
    priceUsd: 45,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Grey Smart Shirt",
    code: "AY-372",
    image: "/seed/shirts/grey-smart-shirt.jpg",
    description:
      "Slim-fit cotton button-down in a clean mid-grey. Spread collar, single chest pocket, mother-of-pearl buttons. The shirt that quietly works for everything.",
    categoryId: "men",
    priceUsd: 45,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
];

// J&J patterned — four distinct designs at separate AY codes.
const JJ_PATTERNED: ProductSpec[] = [
  {
    name: "Cream Tonal Floral Shirt",
    code: "AY-355",
    image: "/seed/shirts/cream-tonal-floral-shirt.jpg",
    description:
      "Off-white cotton shirt with subtle tonal paisley-floral embroidery across the front. Slim fit, spread collar. Quiet detail at arm's length, real character up close.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: true,
  },
  {
    name: "Black Leaf Print Shirt",
    code: "AY-269",
    image: "/seed/shirts/black-leaf-shirt.jpg",
    description:
      "All-over leaf-print shirt in deep black with grey sketched foliage. Slim fit, spread collar, single chest pocket. A statement shirt that still reads grown-up.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Grey Tartan Check Shirt",
    code: "AY-210",
    image: "/seed/shirts/grey-tartan-check-shirt.jpg",
    description:
      "Black-and-grey tartan with thin red over-check, on a brushed cotton ground. Slim fit, spread collar, single chest pocket. Built for cooler evenings.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Painterly Stripe Shirt",
    code: "AY-354",
    image: "/seed/shirts/grey-painterly-stripe-shirt.jpg",
    description:
      "Vertical painterly stripes in black and oat on a textured cotton base. Looks like brushed ink up close. Slim fit, spread collar, single chest pocket.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
];

// ANTELOPUS YOUNG camp shirts — boxier fit, fashion-forward prints.
const ANTELOPUS: ProductSpec[] = [
  {
    name: "Mustard Floral Camp Shirt",
    image: "/seed/shirts/mustard-floral-camp-shirt.jpg",
    description:
      "Boxy camp-collar shirt in warm mustard with bold black floral print and a geometric border at the hem. Short sleeves, button-through front. Holiday energy, year-round wear.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: true,
  },
  {
    name: "White Ink-Floral Camp Shirt",
    image: "/seed/shirts/white-floral-camp-shirt.jpg",
    description:
      "Regular-fit camp-collar shirt in clean white with scattered black ink-blot florals concentrated at the shoulders. Short sleeves, drapey weave. Easy with linen trousers.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Cream Vine-Trim Camp Shirt",
    image: "/seed/shirts/cream-vine-trim-camp-shirt.jpg",
    description:
      "Camp-collar shirt in soft cream with hand-drawn black vine trim running down the placket, around the collar, and along the hem. Short sleeves, boxy cut.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Mauve Ink-Floral Camp Shirt",
    image: "/seed/shirts/mauve-floral-camp-shirt.jpg",
    description:
      "The same ink-blot floral print, this time on dusty mauve. Camp collar, boxy cut, short sleeves. Unexpected colour with serious staying power.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Grey Textured Floral Camp Shirt",
    image: "/seed/shirts/grey-textured-floral-camp-shirt.jpg",
    description:
      "Camp-collar shirt in pinstriped grey ground with raised cream floral embroidery scattered throughout. Texture you can feel. Short sleeves, relaxed cut.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
  {
    name: "Gradient Wave Camp Shirt",
    image: "/seed/shirts/gradient-wave-camp-shirt.jpg",
    description:
      "The statement piece. Sky-to-peach gradient body with wavy yellow, cream, and pink stripes running the placket and hem. Camp collar, short sleeves, boxy cut.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: true,
  },
  {
    name: "Cream Corduroy Floral Camp Shirt",
    image: "/seed/shirts/cream-corduroy-floral-camp-shirt.jpg",
    description:
      "Camp-collar shirt in soft cream corduroy with raised tonal white floral embroidery. Texture-on-texture, short sleeves, relaxed boxy fit.",
    categoryId: "men",
    priceUsd: 50,
    sizes: ADULT_SIZES,
    stock: 3,
    featured: false,
  },
];

// Boys — broadens /kids beyond party dresses.
const KIDS_BOYS: ProductSpec[] = [
  {
    name: "Boys Palm-Tree Linen Set",
    image: "/seed/kids/boys-palm-tree-linen-set.jpg",
    description:
      "Three-piece set for little gentlemen: cream linen waistcoat with embroidered palm-tree motif, matching short-sleeve shirt in palm-print linen, and soft natural-linen trousers. Ready for weddings, beach days, and family photos.",
    categoryId: "kids",
    priceUsd: 55,
    sizes: KIDS_2_5,
    stock: 5,
    featured: true,
  },
  {
    name: "Boys Good Vibes Shacket Set",
    image: "/seed/kids/boys-good-vibes-shacket-set.jpg",
    description:
      "Two-piece set: cream waffle-knit shacket with chenille 'Good Vibes' patch and navy buttons, paired with soft navy joggers. Easy weekend look that survives a real toddler day.",
    categoryId: "kids",
    priceUsd: 55,
    sizes: KIDS_2_5,
    stock: 5,
    featured: true,
  },
];

const ALL_PRODUCTS = [...JJ_PLAIN, ...JJ_PATTERNED, ...ANTELOPUS, ...KIDS_BOYS];

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
    // /api/admin/seed-shirts-kids for the same posture.
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
