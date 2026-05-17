import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { uploadImage } from "@/lib/blob";
import { getDb, schema } from "@/db";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const productId = String(form.get("productId") ?? "");
  if (!(file instanceof File) || !productId) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, error: "unsupported type" }, { status: 415 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "too large (10MB max)" }, { status: 413 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const pathname = `products/${productId}/${crypto.randomUUID()}.${ext}`;
  const buf = await file.arrayBuffer();
  const { url, pathname: blobPath } = await uploadImage(pathname, buf, file.type);

  const db = await getDb();
  await db.insert(schema.productImages).values({
    id: crypto.randomUUID(),
    productId,
    url,
    blobPath,
    alt: file.name.replace(/\.[^.]+$/, ""),
  });

  return NextResponse.json({ ok: true, url, pathname: blobPath });
}
