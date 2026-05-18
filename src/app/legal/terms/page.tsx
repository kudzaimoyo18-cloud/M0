import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Terms."
      lede="Plain-English terms for using m0-three.vercel.app. Last updated May 2026."
    >
      <H2>Orders</H2>
      <p>
        Placing an order on this site creates a reservation, not a contract. We confirm every order over WhatsApp before dispatch. If we&apos;re out of stock, or the piece doesn&apos;t match what you saw, we&apos;ll tell you in that thread and you can walk away.
      </p>

      <H2>Prices</H2>
      <p>
        Prices on the site are in USD. You can switch the display to ZWG; the ZWG amount uses a daily FX snapshot and is recomputed at checkout. Cash on delivery only. We don&apos;t take card payments online.
      </p>

      <H2>Stock</H2>
      <p>
        Everything we list is in our hands in Harare. Stock can still run out between someone adding to cart and you adding to cart — if that happens we&apos;ll catch it on the WhatsApp confirmation and offer you the nearest size or a different piece.
      </p>

      <H2>Right to refuse</H2>
      <p>
        We reserve the right to decline an order — for example if the address is clearly fake, or if a previous order was returned damaged without explanation. We&apos;ll always say why.
      </p>

      <H2>Disputes</H2>
      <p>
        Anything we get wrong, raise it on WhatsApp first. We aim to resolve within <span className="tabular">48</span> hours. Beyond that, Zimbabwean law applies.
      </p>
    </StaticPage>
  );
}
