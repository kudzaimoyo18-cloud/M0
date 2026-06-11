import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { and, eq, exists } from "drizzle-orm";
import { ProductCard, type ProductCardData } from "@/components/site/product-card";

export const dynamic = "force-dynamic";

const KNOWN = new Set(["women", "men", "kids", "new", "editorial"]);

/** Size chips shown per category. Kids filters by age range instead. */
const SIZE_CHIPS: Record<string, string[]> = {
  women: ["S", "M", "L"],
  men: ["M", "L", "XL", "XXL"],
  kids: ["2-5 Years", "4-7 Years", "8-12 Years"],
  new: [],
  editorial: [],
};

async function loadProducts(categoryId: string, size?: string): Promise<ProductCardData[]> {
  try {
    const db = await getDb();
    const conditions = [eq(schema.products.status, "active")];
    if (categoryId !== "new") {
      conditions.push(eq(schema.products.categoryId, categoryId));
    }
    if (size) {
      conditions.push(
        exists(
          db
            .select({ one: schema.variants.id })
            .from(schema.variants)
            .where(and(eq(schema.variants.productId, schema.products.id), eq(schema.variants.size, size)))
        )
      );
    }
    const rows = await db.select().from(schema.products).where(and(...conditions)).limit(48);
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

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ size?: string }>;
}) {
  const { category } = await params;
  if (!KNOWN.has(category)) notFound();
  const { size } = await searchParams;

  const chips = SIZE_CHIPS[category] ?? [];
  const activeSize = size && chips.includes(size) ? size : undefined;
  const products = await loadProducts(category, activeSize);

  return (
    <div className="px-4 md:px-8 py-8 md:py-12 page-enter">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-section capitalize">{category}</h1>
        <span className="caption text-ink-500 tabular">{products.length} items</span>
      </div>

      {chips.length > 0 && (
        <nav aria-label="Filter by size" className="flex flex-wrap gap-2 mb-8">
          <SizeChip href={`/${category}`} label="All" active={!activeSize} />
          {chips.map((s) => (
            <SizeChip
              key={s}
              href={`/${category}?size=${encodeURIComponent(s)}`}
              label={s}
              active={activeSize === s}
            />
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <div className="py-section text-center">
          <p className="text-ink-500 max-w-measure mx-auto">
            {activeSize
              ? `Nothing in ${activeSize} right now. Try another size.`
              : "No products yet. Add the first one from the admin."}
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

function SizeChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        "label px-4 py-2 border transition-colors duration-fast " +
        (active
          ? "bg-ink-900 text-paper border-ink-900"
          : "bg-paper text-ink-900 border-ink-300 hover:border-ink-900")
      }
    >
      {label}
    </Link>
  );
}