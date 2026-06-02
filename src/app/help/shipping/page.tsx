import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <StaticPage
      eyebrow="Help"
      title="Shipping."
      lede="We currently deliver to Harare only. Orders confirmed on WhatsApp, on your doorstep in 5–7 days."
    >
      <H2>Where we deliver</H2>
      <p>
        Harare and surrounding suburbs only for now. If you&apos;re outside Harare and want a piece, message us on WhatsApp — we sometimes arrange a courier handoff at a bus terminal for nearby cities, case by case.
      </p>

      <H2>How long it takes</H2>
      <p>
        Most Harare deliveries land in <span className="tabular">5–7</span> days from the moment we confirm your order on WhatsApp. We&apos;ll share a tighter ETA in the thread once we&apos;ve confirmed payment and dispatched.
      </p>

      <H2>What it costs</H2>
      <p>
        Delivery is <strong>free on orders over USD 100</strong>. Below that it&apos;s a <span className="tabular">USD 5</span> flat fee, added at checkout in your selected currency. No surprises at the door.
      </p>

      <H2>How payment works</H2>
      <p>
        Payment is arranged in the WhatsApp thread that opens at checkout. We confirm the exact amount and method (bank transfer, mobile money, or in-person before dispatch) before your order leaves. No cash-on-delivery, no card payments online.
      </p>
    </StaticPage>
  );
}
