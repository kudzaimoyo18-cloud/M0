import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Returns & Exchanges" };

export default function ReturnsPage() {
  return (
    <StaticPage
      eyebrow="Help"
      title="Exchanges only."
      lede="We don't take returns. Because every piece is a small import, refunding would mean re-importing, which we can't sustain. We do exchanges for size, within 7 days, via WhatsApp."
    >
      <H2>What qualifies for an exchange</H2>
      <ul className="list-disc ml-5 space-y-2">
        <li>Sizing issue — you want the same piece in a different size, and we have it in stock.</li>
        <li>Within <span className="tabular">7</span> days of delivery.</li>
        <li>Unworn, with original tags attached.</li>
        <li>No make-up marks, no perfume, no smoke.</li>
      </ul>

      <H2>What doesn&apos;t qualify</H2>
      <ul className="list-disc ml-5 space-y-2">
        <li>Change of mind, change of taste, change of plan.</li>
        <li>Anything worn outside the house.</li>
        <li>Final-sale items (we mark these explicitly in WhatsApp before you commit).</li>
      </ul>

      <H2>How to do it</H2>
      <p>
        Open the WhatsApp thread for your order, send a quick photo of the piece with the tag visible, and tell us the size you want. We&apos;ll arrange the swap — driver brings the new size, takes the old one back, same delivery.
      </p>

      <H2>Who pays</H2>
      <p>
        Customer covers the courier fee for the swap (USD <span className="tabular">5</span> flat in Harare). If we got it wrong on our side — wrong size sent, item damaged in our packaging — we cover it.
      </p>
    </StaticPage>
  );
}
