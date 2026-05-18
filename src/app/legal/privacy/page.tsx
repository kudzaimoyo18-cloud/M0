import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Privacy."
      lede="We collect the minimum we need to fulfil your order. We don't sell or share your data. Last updated May 2026."
    >
      <H2>What we collect</H2>
      <ul className="list-disc ml-5 space-y-2">
        <li><strong>Order details</strong> — name, phone, delivery address, email, what you bought. Stored in our database so we can ship it and so you can track it.</li>
        <li><strong>WhatsApp conversation</strong> — the messages you send us. Held by WhatsApp under its own privacy policy; we keep our copy as long as it&apos;s useful for service.</li>
        <li><strong>Cart and wishlist</strong> — stored in your browser&apos;s local storage. Never leaves your device unless you check out.</li>
      </ul>

      <H2>What we don&apos;t do</H2>
      <ul className="list-disc ml-5 space-y-2">
        <li>We don&apos;t sell your data to third parties.</li>
        <li>We don&apos;t use ad-tracking pixels.</li>
        <li>We don&apos;t share your address with anyone outside the delivery driver assigned to your order.</li>
      </ul>

      <H2>Your rights</H2>
      <p>
        Message us on WhatsApp to ask what we have on file, correct it, or delete it. We&apos;ll action it within <span className="tabular">7</span> working days.
      </p>
    </StaticPage>
  );
}
