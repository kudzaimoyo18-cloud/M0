import Link from "next/link";
import Image from "next/image";

export interface MarqueeItem {
  slug: string;
  name: string;
  imageUrl: string;
}

/**
 * Vertical auto-scroll marquee — two columns of product imagery drifting in
 * opposite directions. Premium-retail motif. Pure CSS animation
 * (translateY on the compositor); pauses on hover; disabled entirely under
 * prefers-reduced-motion via the global reduced-motion override.
 *
 * Each column renders its items twice so the -50% translate loops
 * seamlessly.
 */
export function ProductMarquee({ items }: { items: MarqueeItem[] }) {
  if (items.length < 4) return null;

  const mid = Math.ceil(items.length / 2);
  const colA = items.slice(0, mid);
  const colB = items.slice(mid);

  return (
    <div className="marquee-viewport" aria-hidden>
      <div className="marquee-col marquee-up">
        {[...colA, ...colA].map((item, i) => (
          <MarqueeTile key={`a-${item.slug}-${i}`} item={item} />
        ))}
      </div>
      <div className="marquee-col marquee-down">
        {[...colB, ...colB].map((item, i) => (
          <MarqueeTile key={`b-${item.slug}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function MarqueeTile({ item }: { item: MarqueeItem }) {
  return (
    <Link href={`/product/${item.slug}`} tabIndex={-1} className="marquee-tile block relative">
      <Image
        src={item.imageUrl}
        alt={item.name}
        fill
        sizes="(min-width: 768px) 20vw, 40vw"
        className="object-cover"
      />
    </Link>
  );
}