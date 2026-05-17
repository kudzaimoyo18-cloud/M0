"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    startTransition(async () => {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("productId", productId);
        const res = await fetch("/api/admin/upload", { method: "POST", body: form });
        if (!res.ok) {
          setError(`Upload failed: ${file.name}`);
          return;
        }
      }
      router.refresh();
    });
  }

  return (
    <div>
      <label className="btn-secondary inline-flex cursor-pointer">
        {pending ? "Uploading…" : "Upload images"}
        <input type="file" accept="image/*" multiple className="hidden" onChange={onChange} disabled={pending} />
      </label>
      {error && <p role="alert" className="text-danger text-[13px] mt-2">{error}</p>}
    </div>
  );
}
