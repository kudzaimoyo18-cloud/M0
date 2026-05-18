import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/db";

/**
 * One-shot catalog seed endpoint.
 *
 *   GET /api/admin/seed?wipe=1
 *
 * Authenticated (m0_admin cookie). Generates a ~100-SKU catalog of plain-
 * colorway essentials across women + men: baggy jeans, cropped tees and
 * shirts, oversized tees, cargo trousers, knit sweaters, linen shirts, and
 * slip dresses. Same hero image is reused across colorways of the same
 * style — typical for catalog photography.
 *
 * The route is GET-callable so the admin can trigger it from a browser
 * with an active session cookie. With ?wipe=1 it TRUNCATEs products,
 * variants, images, and orders first (categories preserved).
 */

const COLORS_FULL = [
  "Black",
  "White",
  "Ecru",
  "Stone",
  "Sand",
  "Olive",
  "Navy",
  "Charcoal",
  "Butter",
  "Mocha",
];

const IMG = {
  // All Unsplash, plain-background editorial fashion shots. Validated remote
  // patterns in next.config.ts.
  jean: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=80&fit=crop",
  tee: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=1200&q=80&fit=crop",
  shirt: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=1200&q=80&fit=crop",
  knit: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=80&fit=crop",
  cargo: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=80&fit=crop",
  dress: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1200&q=80&fit=crop",
} as const;

interface StyleSpec {
  name: string;
  genders: ("women" | "men")[];
  basePriceUsd: number;
  sizes: string[];
  imageUrl: string;
  colorways: string[];
  featuredCount: number;
  description: string;
}

const STYLES: StyleSpec[] = [
  {
    name: "Baggy Jean",
    genders: ["women", "men"],
    basePriceUsd: 89,
    sizes: ["26", "28", "30", "32"],
    imageUrl: IMG.jean,
    colorways: ["Black", "White", "Ecru", "Stone", "Sand", "Navy", "Charcoal", "Mocha"],
    featuredCount: 2,
    description: "Wide-leg, mid-rise denim with a relaxed seat and full break. 100% rigid cotton.",
  },
  {
    name: "Cropped Cotton Tee",
    genders: ["women"],
    basePriceUsd: 35,
    sizes: ["XS", "S", "M", "L"],
    imageUrl: IMG.tee,
    colorways: COLORS_FULL,
    featuredCount: 2,
    description: "Boxy crop in heavyweight combed cotton. Rib crew, dropped shoulder, raw-cut hem.",
  },
  {
    name: "Cropped Shirt",
    genders: ["women"],
    basePriceUsd: 59,
    sizes: ["XS", "S", "M", "L"],
    imageUrl: IMG.shirt,
    colorways: COLORS_FULL,
    featuredCount: 2,
    description: "Cropped button-down in poplin cotton. Camp collar, side splits, mother-of-pearl buttons.",
  },
  {
    name: "Oversized Tee",
    genders: ["women", "men"],
    basePriceUsd: 42,
    sizes: ["XS", "S", "M", "L"],
    imageUrl: IMG.tee,
    colorways: ["Black", "White", "Ecru", "Stone", "Sand", "Olive", "Charcoal", "Mocha"],
    featuredCount: 1,
    description: "Boxy oversized fit, 220gsm cotton. Reinforced shoulders, no logo, runs true.",
  },
  {
    name: "Cargo Trouser",
    genders: ["women", "men"],
    basePriceUsd: 95,
    sizes: ["26", "28", "30", "32"],
    imageUrl: IMG.cargo,
    colorways: ["Black", "Sand", "Olive", "Charcoal", "Stone", "Mocha"],
    featuredCount: 1,
    description: "Mid-rise straight cargo in washed cotton twill. Six pockets, drawcord waist.",
  },
  {
    name: "Knit Sweater",
    genders: ["women", "men"],
    basePriceUsd: 79,
    sizes: ["XS", "S", "M", "L"],
    imageUrl: IMG.knit,
    colorways: ["Black", "White", "Ecru", "Stone", "Sand", "Navy", "Charcoal", "Butter"],
    featuredCount: 1,
    description: "Relaxed crewneck in a soft cotton blend. Ribbed neck, cuffs, and hem.",
  },
  {
    name: "Linen Shirt",
    genders: ["women", "men"],
    basePriceUsd: 69,
    sizes: ["XS", "S", "M", "L"],
    imageUrl: IMG.shirt,
    colorways: ["White", "Ecru", "Sand", "Stone", "Olive", "Butter"],
    featuredCount: 1,
    description: "100% European linen, boxy fit. Spread collar, side gussets, pearl buttons.",
  },
  {
    name: "Slip Dress",
    genders: ["women"],
    basePriceUsd: 65,
    sizes: ["XS", "S", "M", "L"],
    imageUrl: IMG.dress,
    colorways: ["Black", "Ecru", "Sand", "Stone", "Navy", "Charcoal", "Butter", "Mocha"],
    featuredCount: 1,
    description: "Bias-cut midi slip in satin viscose. Adjustable straps, soft drape, side splits.",
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

async function seed(wipe: boolean) {
  const db = await getDb();

  if (wipe) {
    await db.execute(
      sql`TRUNCATE TABLE order_items, orders, product_images, variants, products RESTART IDENTITY CASCADE;`
    );
  }

  const products: (typeof schema.products.$inferInsert)[] = [];
  const variants: (typeof schema.variants.$inferInsert)[] = [];
  const images: (typeof schema.productImages.$inferInsert)[] = [];

  for (const style of STYLES) {
    for (const gender of style.genders) {
      style.colorways.forEach((color, i) => {
        const productId = crypto.randomUUID();
        const slug = `${slugify(color)}-${slugify(style.name)}-${gender}`;
        const name = `${color} ${style.name}`;
        const featured = i < style.featuredCount;

        products.push({
          id: productId,
          slug,
          name,
          description: style.description,
          categoryId: gender,
          priceUsdMinor: Math.round(style.basePriceUsd * 100),
          status: "active",
          featured,
        });

        for (const size of style.sizes) {
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
          url: style.imageUrl,
          blobPath: `seed/${slug}`,
          alt: name,
          position: 0,
        });
      });
    }
  }

  // Drizzle accepts array values for batch insert.
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
