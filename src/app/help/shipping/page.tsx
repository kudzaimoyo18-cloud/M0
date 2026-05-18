import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <StaticPage
      eyebrow="Help"
      title="Shipping."
      lede="We currently deliver to Harare only. Orders out within 24 hours, on your doorstep in 2–5 working days."
    >
      <H2>Where we deliver</H2>
      <p>
        Harare and surrounding suburbs only for now. If you&apos;re outside Harare and want a piece, message us on WhatsApp — we sometimes arrange a courier handoff at a bus terminal for nearby cities, case by case.
      </p>

      <H2>How long it takes</H2>
      <p>
        Most Harare deliveries land in <span className="tabular">2–5</span> working days from the moment we confirm your order on WhatsApp. Same-day is possible for orders placed before 11am — ask us.
      </p>

      <H2>What it costs</H2>
      <p>
        Delivery is <strong>free on orders over USD 100</strong>. Below that it&apos;s a <span className="tabular">USD 5</span> flat fee, added at checkout in your selected currency. No surprises at the door.
      </p>

      <H2>How payment works</H2>
      <p>
        Cash on delivery. Hand the driver USD or ZWG (your choice at checkout). We confirm the exact amount with you on WhatsApp before dispatch, so you&apos;re never caught short.
      </p>
    </StaticPage>
  );
}
