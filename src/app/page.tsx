import Link from "next/link";
import Image from "next/image";
import { getDb, schema } from "@/db";
import { and, eq, desc } from "drizzle-orm";
import { ProductCard, type ProductCardData } from "@/components/site/product-card";

export const dynamic = "force-dynamic";

async function getFeaturedProducts(): Promise<ProductCardData[]> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.status, "active"), eq(schema.products.featured, true)))
      .orderBy(desc(schema.products.createdAt))
      .limit(8);

    const out: ProductCardData[] = [];
    for (const r of rows) {
      const imgs = await db
        .select({ url: schema.productImages.url, alt: schema.productImages.alt })
        .from(schema.productImages)
        .where(eq(schema.productImages.productId, r.id))
        .orderBy(schema.productImages.position);
      out.push({
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

export default async function HomePage() {
  const featured = await getFeaturedProducts();

  return (
    <>
      <section className="relative w-full h-[100svh] min-h-[640px] bg-ink-100">
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=80"
          alt="M0 — Autumn collection editorial"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 md:pb-24">
          <h1 className="text-paper font-display text-display text-center px-4 drop-shadow">
            The Autumn Collection
          </h1>
          <Link href="/women" className="label text-paper mt-6 border-b border-paper pb-1">
            Discover
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink-300">
        {[
          { label: "Women", href: "/women", img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80" },
          { label: "Men", href: "/men", img: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=1400&q=80" },
        ].map((tile) => (
          <Link key={tile.href} href={tile.href} className="relative aspect-product md:aspect-[4/5] bg-ink-100 group overflow-hidden">
            <Image src={tile.img} alt={`${tile.label} collection`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 flex items-end justify-center pb-10 md:pb-14">
              <span className="label text-paper border-b border-paper pb-1">{tile.label}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="px-4 md:px-8 py-section">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-section">New In</h2>
          <Link href="/new" className="label hover:opacity-70">View all</Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-ink-500 max-w-measure">
            Featured products will appear here once they are added in the admin.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-ink-300">
            {featured.map((p, i) => (
              <div key={p.slug} className="bg-paper p-px">
                <ProductCard product={p} priority={i < 4} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
