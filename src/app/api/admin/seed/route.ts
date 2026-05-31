import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/db";

/**
 * One-shot catalog seed.
 *
 *   GET /api/admin/seed?wipe=1
 *
 * Admin-cookie gated. Wipes products / variants / product_images and seeds
 * the WhatsApp-derived catalog: 9 styles × multiple plain colorways = 28
 * women's two- and three-piece sets, flat USD 90, sizes S/M/L. Hero photos
 * live under /public/seed/ and are served by Vercel directly.
 *
 * Orders are NEVER touched by this endpoint — historical order_items keep
 * snapshotted product names, so deleting the products doesn't lose the
 * record.
 *
 * Names are generic ("Logo Knit Set" not "Hermes set") — photos still show
 * branding but the listings don't make claims of authenticity.
 */

interface StyleSpec {
  /** Public-facing style label (used as part of product name) */
  name: string;
  /** Relative path under /public/seed/ */
  image: string;
  /** Product description shown on PDP */
  description: string;
  /** Available colorways — each becomes a separate SKU */
  colorways: string[];
  /** Mark first N colorways as featured for the homepage New In grid */
  featuredCount: number;
}

const STYLES: StyleSpec[] = [
  {
    name: "Geometric Knit Set",
    image: "/seed/geometric-knit-set.jpg",
    description:
      "Three-piece knit set — cropped cardigan, fitted bralette, and wide-leg trousers in a bold labyrinth pattern. Gold-tone buttons, ribbed cuffs and hem. Soft cotton blend.",
    colorways: ["White", "Black", "Beige"],
    featuredCount: 1,
  },
  {
    name: "Striped Cardigan Set",
    image: "/seed/striped-cardigan-set.jpg",
    description:
      "Three-piece preppy set — striped cardigan with logo patch, matching knit bralette, and wide-leg trousers. Contrast burgundy stripes at hem and cuffs.",
    colorways: ["White", "Grey", "Beige", "Navy"],
    featuredCount: 2,
  },
  {
    name: "V-Neck Cardigan Set",
    image: "/seed/vneck-cardigan-set.jpg",
    description:
      "Three-piece knit ensemble — sleeveless V-neck vest, matching cardigan, and high-waist wide-leg trousers. Embroidered crest at chest.",
    colorways: ["Grey", "Black", "White", "Brown"],
    featuredCount: 2,
  },
  {
    name: "Logo Knit Set",
    image: "/seed/logo-knit-set.jpg",
    description:
      "Three-piece knit set — cropped sleeveless top, button-front cardigan, and wide-leg trousers. Bold logo accents in contrast colorway.",
    colorways: ["Beige", "Black", "Grey", "Navy"],
    featuredCount: 2,
  },
  {
    name: "Crest Tee Set",
    image: "/seed/crest-tee-set.jpg",
    description:
      "Two-piece loungewear set — soft cotton crewneck tee with embroidered crest, and matching wide-leg jogger trousers with drawcord waist.",
    colorways: ["Black", "Brown", "Red", "Navy"],
    featuredCount: 1,
  },
  {
    name: "Triangle Patch Tee Set",
    image: "/seed/triangle-tee-set.jpg",
    description:
      "Two-piece athletic-inspired set — crewneck tee with horizontal stripe and triangle patch, and joggers with three-stripe side panel. Cotton blend.",
    colorways: ["Red", "Brown"],
    featuredCount: 1,
  },
  {
    name: "Patch Logo Tee Set",
    image: "/seed/patch-tee-set.jpg",
    description:
      "Two-piece loungewear set — crewneck tee and wide-leg jogger trousers with woven logo patches. Lightweight cotton, dropped shoulder.",
    colorways: ["Navy", "White", "Black"],
    featuredCount: 2,
  },
  {
    name: "Leather Patch Tee Set",
    image: "/seed/leather-patch-tee-set.jpg",
    description:
      "Two-piece minimal set — crewneck tee and matching jogger trousers, each with a contrast tan leather patch at chest and thigh. Slouchy relaxed fit.",
    colorways: ["Brown", "Black", "Red"],
    featuredCount: 1,
  },
  {
    name: "Side-Stripe Polo Set",
    image: "/seed/side-stripe-tee-set.jpg",
    description:
      "Two-piece short-sleeve set — quarter-zip polo and matching wide-leg trousers with contrast side stripes. Athletic-inspired, easy throw-on.",
    colorways: ["Brown"],
    featuredCount: 1,
  },
];

const SIZES = ["S", "M", "L"] as const;
const PRICE_USD = 90;

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function seed(wipe: boolean) {
  const db = await getDb();

  if (wipe) {
    // Wipe products + variants + product_images. PRESERVE orders +
    // order_items so historical records survive (order rows snapshot
    // productName / variantLabel at checkout time).
    await db.execute(
      sql`TRUNCATE TABLE product_images, variants, products RESTART IDENTITY CASCADE;`
    );
  }

  const products: (typeof schema.products.$inferInsert)[] = [];
  const variants: (typeof schema.variants.$inferInsert)[] = [];
  const images: (typeof schema.productImages.$inferInsert)[] = [];

  for (const style of STYLES) {
    style.colorways.forEach((color, i) => {
      const productId = crypto.randomUUID();
      const slug = `${slugify(color)}-${slugify(style.name)}`;
      const name = `${color} ${style.name}`;
      const featured = i < style.featuredCount;

      products.push({
        id: productId,
        slug,
        name,
        description: style.description,
        categoryId: "women",
        priceUsdMinor: PRICE_USD * 100,
        status: "active",
        featured,
      });

      for (const size of SIZES) {
        variants.push({
          id: crypto.randomUUID(),
          productId,
          sku: `${slug}-${size.toLowerCase()}`,
          size,
          inventory: 10,
        });
      }

      images.push({
        id: crypto.randomUUID(),
        productId,
        url: style.image,
        blobPath: `public${style.image}`,
        alt: name,
        position: 0,
      });
    });
  }

  await db.insert(schema.products).values(products);
  await db.insert(schema.variants).values(variants);
  await db.insert(schema.productImages).values(images);

  return {
    products: products.length,
    variants: variants.length,
    images: images.length,
    featured: products.filter((p) => p.featured).length,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const wipe = url.searchParams.get("wipe") === "1";
  try {
    const counts = await seed(wipe);
    return NextResponse.json({ ok: true, wiped: wipe, counts });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "seed failed" },
      { status: 500 }
    );
  }
}

export const POST = GET;
