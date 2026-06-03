import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { ProductCard, type ProductCardData } from "@/components/site/product-card";

export const dynamic = "force-dynamic";

const KNOWN = new Set(["women", "men", "kids", "new", "editorial"]);

async function loadProducts(categoryId: string): Promise<ProductCardData[]> {
  try {
    const db = await getDb();
    const where =
      categoryId === "new"
        ? eq(schema.products.status, "active")
        : and(eq(schema.products.status, "active"), eq(schema.products.categoryId, categoryId));
    const rows = await db.select().from(schema.products).where(where).limit(48);
    const out: ProductCardData[] = [];
    for (const r of rows) {
      const imgs = await db
        .select({ url: schema.productImages.url, alt: schema.productImages.alt })
        .from(schema.productImages)
        .where(eq(schema.productImages.productId, r.id))
        .orderBy(schema.productImages.position);
      out.push({
        productId: r.id,
        slug: r.slug,
        name: r.name,
        priceUsdMinor: r.priceUsdMinor,
        compareAtUsdMinor: r.compareAtUsdMinor,
        images: imgs.map((i) => ({ url: i.url, alt: i.alt ?? undefined })),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!KNOWN.has(category)) notFound();

  const products = await loadProducts(category);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-section capitalize">{category}</h1>
        <span className="caption text-ink-500 tabular">{products.length} items</span>
      </div>
      {products.length === 0 ? (
        <div className="py-section text-center">
          <p className="text-ink-500 max-w-measure mx-auto">
            No products yet. Add the first one from the admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-ink-300">
          {products.map((p, i) => (
            <div key={p.slug} className="bg-paper p-px">
              <ProductCard product={p} priority={i < 4} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
