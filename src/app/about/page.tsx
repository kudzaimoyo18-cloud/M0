import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <StaticPage
      eyebrow="About"
      title="The store we wished we had."
      lede="M0 started for one reason: ordering from Shein and shipping to Zimbabwe became almost impossible. Long waits, parcels lost in transit, customs surprises. So we built the alternative."
    >
      <p>
        Twice a season we fly to Dubai and walk the floor — the wholesalers, the boutiques, the warehouses behind the malls. We hand-pick a tight edit: the pieces we&apos;d actually wear, in the cuts and fabrics worth the trip.
      </p>
      <p>
        Then we bring them home. Stock lives in Harare. Orders confirm over WhatsApp. Payment is cash on delivery. No customs, no waiting, no guessing what you&apos;ll get in the box.
      </p>

      <H2>What we&apos;re not</H2>
      <p>
        We&apos;re not a marketplace. We don&apos;t list a thousand SKUs to make the catalogue look big. Every piece on this site is in our hands, in Harare, ready to go out today.
      </p>

      <H2>How to reach us</H2>
      <p>
        WhatsApp is the fastest line. The number is in the footer of every page, and any order you place opens a thread with us automatically. Sizing questions, styling, fit checks, restocks — that&apos;s the channel.
      </p>
    </StaticPage>
  );
}
