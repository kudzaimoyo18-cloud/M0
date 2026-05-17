"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface WishItem {
  productId: string;
  slug: string;
  name: string;
  priceUsdMinor: number;
  imageUrl?: string;
}

const STORAGE_KEY = "m0:wishlist";

function loadWishlist(): WishItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WishItem[];
  } catch {
    return [];
  }
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadWishlist());
    setHydrated(true);
  }, []);

  function remove(productId: string) {
    const next = items.filter((i) => i.productId !== productId);
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  if (!hydrated) {
    return <div className="px-4 md:px-8 py-section"><h1 className="font-display text-section">Wishlist</h1></div>;
  }

  return (
    <div className="px-4 md:px-8 py-8 md:py-12">
      <h1 className="font-display text-section mb-8">Wishlist</h1>
      {items.length === 0 ? (
        <div>
          <p className="text-ink-500">Nothing saved yet.</p>
          <Link href="/women" className="btn-secondary mt-6">Browse the collection</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-ink-300">
          {items.map((i) => (
            <li key={i.productId} className="bg-paper p-px">
              <div className="relative aspect-product bg-ink-100">
                {i.imageUrl && <Image src={i.imageUrl} alt={i.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <Link href={`/product/${i.slug}`} className="text-[13px] leading-tight hover:opacity-70">{i.name}</Link>
                <button onClick={() => remove(i.productId)} className="label opacity-60 hover:opacity-100">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
