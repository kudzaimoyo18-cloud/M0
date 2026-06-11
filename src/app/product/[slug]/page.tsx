import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { and, eq, ne } from "drizzle-orm";
import { Price } from "@/components/site/price";
import { AddToBag } from "@/app/product/[slug]/_add-to-bag";
import { WishlistButton } from "@/app/product/[slug]/_wishlist-button";
import { ProductCard, type ProductCardData } from "@/components/site/product-card";

export const dynamic = "force-dynamic";

async function getRelated(categoryId: string | null, excludeId: string): Promise<ProductCardData[]> {
  if (!categoryId) return [];
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.status, "active"),
          eq(schema.products.categoryId, categoryId),
          ne(schema.products.id, excludeId)
        )
      )
      .limit(4);
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

export default async function PDP({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();

  const product = (await db.select().from(schema.products).where(eq(schema.products.slug, slug)).limit(1))[0];
  if (!product || product.status !== "active") notFound();

  const [variants, images, related] = await Promise.all([
    db.select().from(schema.variants).where(eq(schema.variants.productId, product.id)).orderBy(schema.variants.position),
    db
      .select({ url: schema.productImages.url, alt: schema.productImages.alt })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, product.id))
      .orderBy(schema.productImages.position),
    getRelated(product.categoryId, product.id),
  ]);

  return (
    <div className="page-enter">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        <div className="bg-ink-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink-300">
            {images.length === 0 ? (
              <div className="aspect-product bg-ink-100 flex items-center justify-center text-ink-500">No images</div>
            ) : (
              images.map((img, i) => (
                <div key={img.url} className="relative aspect-product bg-paper card-zoom">
                  <Image
                    src={img.url}
                    alt={img.alt ?? product.name}
                    fill
                    sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
                    priority={i === 0}
                    className="object-cover"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="px-4 md:px-8 py-8 lg:py-12 lg:sticky lg:top-[72px] self-start">
          <h1 className="font-display text-section">{product.name}</h1>
          <div className="mt-3">
            <Price usdMinor={product.priceUsdMinor} compareUsdMinor={product.compareAtUsdMinor ?? undefined} />
          </div>

          {product.description && (
            <p className="mt-6 text-ink-700 max-w-measure" style={{ fontSize: "15px", lineHeight: 1.6 }}>
              {product.description}
            </p>
          )}

          <div className="mt-8">
            <AddToBag
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceUsdMinor: product.priceUsdMinor,
                imageUrl: images[0]?.url,
              }}
              variants={variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                inventory: v.inventory,
              }))}
            />
          </div>

          <div className="mt-6">
            <WishlistButton
              item={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                priceUsdMinor: product.priceUsdMinor,
                imageUrl: images[0]?.url,
              }}
            />
          </div>

          <dl className="mt-10 border-t border-ink-300 pt-6 grid grid-cols-1 gap-3 caption text-ink-500">
            <div className="flex justify-between"><dt>Delivery</dt><dd>5–7 days, Harare only</dd></div>
            <div className="flex justify-between"><dt>Payment</dt><dd>Card, EcoCash, or arranged on WhatsApp</dd></div>
            <div className="flex justify-between"><dt>Returns</dt><dd>30 days, unworn, tags attached</dd></div>
          </dl>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="px-4 md:px-8 py-section border-t border-ink-300">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-section">You may also like</h2>
            {product.categoryId && (
              <Link href={`/${product.categoryId}`} className="label hover:opacity-70 transition-opacity duration-fast">
                View all
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-300">
            {related.map((p) => (
              <div key={p.slug} className="bg-paper p-px">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}