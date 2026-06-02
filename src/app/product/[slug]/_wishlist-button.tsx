"use client";

import { Heart } from "lucide-react";
import { useWishlist, type WishlistItem } from "@/components/providers/wishlist-provider";
import { cn } from "@/lib/utils";

/**
 * Heart toggle for the PDP. Mirrors the affordance on the PLP product card
 * so wishlist state is consistent across PLP → PDP → /wishlist.
 */
export function WishlistButton({ item }: { item: WishlistItem }) {
  const { has, toggle } = useWishlist();
  const active = has(item.productId);

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={active}
      className="inline-flex items-center gap-2 label text-ink-700 hover:text-ink-900"
    >
      <Heart className={cn("h-4 w-4", active && "fill-ink-900")} strokeWidth={1.25} />
      {active ? "Saved" : "Save"}
    </button>
  );
}
