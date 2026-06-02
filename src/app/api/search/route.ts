import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Product search.
 *
 *   GET /api/search?q=<term>
 *
 * Returns up to 8 active products whose name or description contains the
 * term (case-insensitive). Empty / short terms (<2 chars) return [] so the
 * dropdown doesn't flicker on the first keystroke.
 */

interface SearchHit {
  productId: string;
  slug: string;
  name: string;
  priceUsdMinor: number;
  imageUrl: string | null;
}

const MAX_HITS = 8;
const MIN_TERM_LENGTH = 2;

export async function GET(req: NextRequest) {
  const term = (new URL(req.url).searchParams.get("q") ?? "").trim();

  if (term.length < MIN_TERM_LENGTH) {
    return NextResponse.json({ ok: true, hits: [] satisfies SearchHit[] });
  }

  try {
    const db = await getDb();
    const like = `%${term}%`;
    const rows = await db
      .select({
        productId: schema.products.id,
        slug: schema.products.slug,
        name: schema.products.name,
        priceUsdMinor: schema.products.priceUsdMinor,
      })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.status, "active"),
          or(
            ilike(schema.products.name, like),
            ilike(schema.products.description, like),
          ),
        ),
      )
      .limit(MAX_HITS);

    // Pull the first image for each hit. N+1 is fine at MAX_HITS=8; if this
    // ever grows past 50, switch to a single LEFT JOIN LATERAL query.
    const hits: SearchHit[] = await Promise.all(
      rows.map(async (r) => {
        const img = await db
          .select({ url: schema.productImages.url })
          .from(schema.productImages)
          .where(eq(schema.productImages.productId, r.productId))
          .orderBy(schema.productImages.position)
          .limit(1);
        return {
          productId: r.productId,
          slug: r.slug,
          name: r.name,
          priceUsdMinor: r.priceUsdMinor,
          imageUrl: img[0]?.url ?? null,
        };
      }),
    );

    return NextResponse.json({ ok: true, hits });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[search] query failed", err);
    return NextResponse.json(
      { ok: false, error: "search failed" },
      { status: 500 },
    );
  }
}
