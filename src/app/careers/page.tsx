import { StaticPage } from "@/components/site/static-page";

export const metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <StaticPage
      eyebrow="Join us"
      title="Careers."
      lede="We're not hiring yet, but we will be. If you'd like to work on M0 — buying, styling, photography, fulfilment — leave us a note on WhatsApp and we'll keep you in mind."
    >
      <p>
        We&apos;re looking for people who care about fit, fabric, and customers more than about job titles. When we open a role, this page will list it.
      </p>
    </StaticPage>
  );
}
