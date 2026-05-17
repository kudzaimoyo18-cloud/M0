import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import { deleteBlob } from "@/lib/blob";
import { ImageUploader } from "@/app/admin/products/[id]/_image-uploader";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const product = (await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1))[0];
  if (!product) notFound();

  const [variants, images] = await Promise.all([
    db.select().from(schema.variants).where(eq(schema.variants.productId, id)).orderBy(schema.variants.position),
    db.select().from(schema.productImages).where(eq(schema.productImages.productId, id)).orderBy(schema.productImages.position),
  ]);

  async function updateProduct(formData: FormData) {
    "use server";
    await requireAdmin();
    const db = await getDb();
    const name = String(formData.get("name") ?? product!.name).trim();
    const priceUsd = parseFloat(String(formData.get("price") ?? "0"));
    await db
      .update(schema.products)
      .set({
        name,
        slug: slugify(name),
        description: String(formData.get("description") ?? "") || null,
        priceUsdMinor: Math.round(priceUsd * 100),
        compareAtUsdMinor: formData.get("compareAt")
          ? Math.round(parseFloat(String(formData.get("compareAt"))) * 100)
          : null,
        status: String(formData.get("status") ?? "draft") as "draft" | "active" | "archived",
        featured: formData.get("featured") === "on",
        categoryId: String(formData.get("category") ?? "") || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id));
    redirect(`/admin/products/${id}`);
  }

  async function addVariant(formData: FormData) {
    "use server";
    await requireAdmin();
    const db = await getDb();
    const size = String(formData.get("size") ?? "").trim() || null;
    const inventory = parseInt(String(formData.get("inventory") ?? "0"), 10) || 0;
    await db.insert(schema.variants).values({
      id: crypto.randomUUID(),
      productId: id,
      sku: `${product!.slug}-${(size ?? "ONE").toLowerCase()}-${Date.now().toString(36)}`,
      size,
      inventory,
    });
    redirect(`/admin/products/${id}`);
  }

  async function deleteVariant(formData: FormData) {
    "use server";
    await requireAdmin();
    const db = await getDb();
    const variantId = String(formData.get("variantId"));
    await db.delete(schema.variants).where(eq(schema.variants.id, variantId));
    redirect(`/admin/products/${id}`);
  }

  async function deleteImage(formData: FormData) {
    "use server";
    await requireAdmin();
    const db = await getDb();
    const imgId = String(formData.get("imageId"));
    const img = (await db.select().from(schema.productImages).where(eq(schema.productImages.id, imgId)).limit(1))[0];
    if (img) {
      try {
        await deleteBlob(img.url);
      } catch {
        /* tolerate orphaned blobs */
      }
      await db.delete(schema.productImages).where(eq(schema.productImages.id, imgId));
    }
    redirect(`/admin/products/${id}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12">
      <form action={updateProduct} className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-section">Edit product</h2>
          <Link href="/admin/products" className="label underline underline-offset-4">All products</Link>
        </div>

        <label className="block">
          <span className="label block mb-2">Name</span>
          <input name="name" defaultValue={product.name} className="input-underline" />
        </label>
        <label className="block">
          <span className="label block mb-2">Slug (auto)</span>
          <input value={product.slug} readOnly className="input-underline text-ink-500" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="label block mb-2">Price (USD)</span>
            <input name="price" type="number" step="0.01" min="0" defaultValue={(product.priceUsdMinor / 100).toFixed(2)} className="input-underline tabular" />
          </label>
          <label className="block">
            <span className="label block mb-2">Compare at (USD)</span>
            <input name="compareAt" type="number" step="0.01" min="0" defaultValue={product.compareAtUsdMinor ? (product.compareAtUsdMinor / 100).toFixed(2) : ""} className="input-underline tabular" />
          </label>
        </div>
        <label className="block">
          <span className="label block mb-2">Description</span>
          <textarea name="description" rows={6} defaultValue={product.description ?? ""} className="input-underline resize-none" />
        </label>
        <div className="grid grid-cols-2 gap-4 items-end">
          <label className="block">
            <span className="label block mb-2">Status</span>
            <select name="status" defaultValue={product.status} className="input-underline bg-paper">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="block">
            <span className="label block mb-2">Category id</span>
            <input name="category" defaultValue={product.categoryId ?? ""} placeholder="women / men / new" className="input-underline" />
          </label>
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={product.featured} />
          <span className="label">Featured on home</span>
        </label>
        <button type="submit" className="btn-primary">Save</button>
      </form>

      <div className="space-y-10">
        <section>
          <h3 className="label mb-4">Images</h3>
          <ImageUploader productId={id} />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {images.map((img) => (
              <div key={img.id} className="relative aspect-product bg-ink-100 border border-ink-300 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt ?? ""} className="absolute inset-0 w-full h-full object-cover" />
                <form action={deleteImage} className="absolute top-1 right-1">
                  <input type="hidden" name="imageId" value={img.id} />
                  <button type="submit" className="bg-paper/90 px-2 py-1 caption">Remove</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="label mb-4">Variants</h3>
          <ul className="border-t border-ink-300">
            {variants.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-3 border-b border-ink-300 text-[14px]">
                <span>{v.size ?? v.color ?? v.sku}</span>
                <span className="tabular text-ink-500">Stock {v.inventory}</span>
                <form action={deleteVariant}>
                  <input type="hidden" name="variantId" value={v.id} />
                  <button type="submit" className="label underline underline-offset-4">Remove</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addVariant} className="flex items-end gap-3 mt-4">
            <label className="flex-1">
              <span className="label block mb-2">Size</span>
              <input name="size" placeholder="S / M / L / 38" className="input-underline" />
            </label>
            <label>
              <span className="label block mb-2">Stock</span>
              <input name="inventory" type="number" min="0" defaultValue="0" className="input-underline w-24 tabular" />
            </label>
            <button type="submit" className="btn-secondary">Add</button>
          </form>
        </section>
      </div>
    </div>
  );
}
