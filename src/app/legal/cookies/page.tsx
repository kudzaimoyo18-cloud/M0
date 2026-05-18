import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Cookies."
      lede="We use a handful of functional cookies and browser storage. Nothing for advertising or third-party tracking."
    >
      <H2>What we set</H2>
      <ul className="list-disc ml-5 space-y-2">
        <li><strong>m0:cart</strong> — local storage. Your bag, so it survives a refresh.</li>
        <li><strong>m0:wishlist</strong> — local storage. Pieces you&apos;ve saved.</li>
        <li><strong>m0:currency</strong> — local storage. Whether you prefer USD or ZWG display.</li>
        <li><strong>m0_admin</strong> — httpOnly cookie, admin section only. Lets the admin stay signed in for 14 days.</li>
      </ul>

      <H2>What we don&apos;t set</H2>
      <ul className="list-disc ml-5 space-y-2">
        <li>No analytics cookies (Google Analytics, Plausible, etc.).</li>
        <li>No ad-network cookies.</li>
        <li>No third-party social-share trackers.</li>
      </ul>

      <H2>Clearing them</H2>
      <p>
        Your browser&apos;s site-settings panel will delete everything above in one click. Doing so will empty your cart and wishlist on this device.
      </p>
    </StaticPage>
  );
}
