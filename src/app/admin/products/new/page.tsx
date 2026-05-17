import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";

export default function NewProductPage() {
  async function create(formData: FormData) {
    "use server";
    await requireAdmin();
    const db = await getDb();
    const name = String(formData.get("name") ?? "").trim();
    const priceUsd = parseFloat(String(formData.get("price") ?? "0"));
    if (!name || Number.isNaN(priceUsd)) return;
    const id = crypto.randomUUID();
    await db.insert(schema.products).values({
      id,
      slug: slugify(name),
      name,
      description: String(formData.get("description") ?? "") || null,
      priceUsdMinor: Math.round(priceUsd * 100),
      status: "draft",
    });
    redirect(`/admin/products/${id}`);
  }

  return (
    <div className="max-w-xl">
      <h2 className="font-display text-section mb-6">New product</h2>
      <form action={create} className="space-y-6">
        <label className="block">
          <span className="label block mb-2">Name *</span>
          <input name="name" required className="input-underline" />
        </label>
        <label className="block">
          <span className="label block mb-2">Price (USD) *</span>
          <input name="price" type="number" step="0.01" min="0" required className="input-underline" />
        </label>
        <label className="block">
          <span className="label block mb-2">Description</span>
          <textarea name="description" rows={4} className="input-underline resize-none" />
        </label>
        <button type="submit" className="btn-primary">Create draft</button>
      </form>
      <p className="caption text-ink-500 mt-4">You can add images and variants on the next screen.</p>
    </div>
  );
}
