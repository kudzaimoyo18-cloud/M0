import { StaticPage } from "@/components/site/static-page";

export const metadata = { title: "Press" };

export default function PressPage() {
  return (
    <StaticPage
      eyebrow="Press"
      title="Press & partnerships."
      lede="For press, collaborations, or stylist requests, WhatsApp is the fastest line. Mention what you're working on and your deadline."
    >
      <p>
        We don&apos;t have a press kit yet. If you need product imagery for a feature, message us and we&apos;ll send the originals at full resolution.
      </p>
    </StaticPage>
  );
}
