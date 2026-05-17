"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart } from "lucide-react";
import { Price } from "@/components/site/price";
import { cn } from "@/lib/utils";

export interface ProductCardData {
  slug: string;
  name: string;
  priceUsdMinor: number;
  compareAtUsdMinor?: number | null;
  images: { url: string; alt?: string }[];
}

export function ProductCard({
  product,
  onWishlistToggle,
  inWishlist = false,
  priority = false,
}: {
  product: ProductCardData;
  onWishlistToggle?: () => void;
  inWishlist?: boolean;
  priority?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const primary = product.images[0];
  const secondary = product.images[1] ?? primary;
  const shown = hover && secondary ? secondary : primary;

  return (
    <div className="group" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-product bg-ink-100 overflow-hidden">
          {primary ? (
            <Image
              src={shown.url}
              alt={shown.alt ?? product.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition-opacity duration-base ease-std"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-500 caption">No image</div>
          )}
          {onWishlistToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWishlistToggle();
              }}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={inWishlist}
              className="absolute top-3 right-3 p-2 bg-paper/80 hover:bg-paper transition-colors duration-fast"
            >
              <Heart className={cn("h-4 w-4", inWishlist && "fill-ink-900")} strokeWidth={1.25} />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h3 className="text-[13px] leading-tight">{product.name}</h3>
          <Price usdMinor={product.priceUsdMinor} compareUsdMinor={product.compareAtUsdMinor ?? undefined} className="text-[13px]" />
        </div>
      </Link>
    </div>
  );
}
