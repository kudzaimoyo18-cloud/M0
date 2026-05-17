import { put, del } from "@vercel/blob";

/**
 * Vercel Blob helpers.
 *
 * BLOB_READ_WRITE_TOKEN is auto-set by the Vercel Storage → Blob integration.
 * In dev, paste it into .env.local.
 */

export async function uploadImage(
  pathname: string,
  body: ArrayBuffer | Blob | ReadableStream,
  contentType: string
): Promise<{ url: string; pathname: string }> {
  const result = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  return { url: result.url, pathname: result.pathname };
}

export async function deleteBlob(urlOrPathname: string) {
  await del(urlOrPathname);
}
