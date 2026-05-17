import { notFound } from "next/navigation";
import Image from "next/image";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Price } from "@/components/site/price";
import { AddToBag } from "@/app/product/[slug]/_add-to-bag";

export const dynamic = "force-dynamic";

export default async function PDP({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();

  const product = (await db.select().from(schema.products).where(eq(schema.products.slug, slug)).limit(1))[0];
  if (!product || product.status !== "active") notFound();

  const [variants, images] = await Promise.all([
    db.select().from(schema.variants).where(eq(schema.variants.productId, product.id)).orderBy(schema.variants.position),
    db
      .select({ url: schema.productImages.url, alt: schema.productImages.alt })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, product.id))
      .orderBy(schema.productImages.position),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
      <div className="bg-ink-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink-300">
          {images.length === 0 ? (
            <div className="aspect-product bg-ink-100 flex items-center justify-center text-ink-500">No images</div>
          ) : (
            images.map((img, i) => (
              <div key={img.url} className="relative aspect-product bg-paper">
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

        <dl className="mt-10 border-t border-ink-300 pt-6 grid grid-cols-1 gap-3 caption text-ink-500">
          <div className="flex justify-between"><dt>Shipping</dt><dd>2–5 working days in Zimbabwe</dd></div>
          <div className="flex justify-between"><dt>Returns</dt><dd>30 days, unworn, tags attached</dd></div>
        </dl>
      </aside>
    </div>
  );
}
