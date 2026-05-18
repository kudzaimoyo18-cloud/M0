import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Stores" };

export default function StoresPage() {
  return (
    <StaticPage
      eyebrow="Visit"
      title="Stores."
      lede="No fixed retail address yet. We work by appointment from a Harare base — message us on WhatsApp to arrange a viewing or pickup."
    >
      <H2>By appointment</H2>
      <p>
        If you&apos;d like to see a piece in person, try it on, or pick up an order rather than wait for delivery, send us a WhatsApp and we&apos;ll set up a time. Most appointments happen on the same day.
      </p>

      <H2>Why no shop</H2>
      <p>
        We keep the operation lean so our prices stay close to what you&apos;d pay in Dubai. A storefront would push everything up by 30–40%. We&apos;d rather be a small, sharp WhatsApp-and-delivery business than a mediocre boutique.
      </p>

      <H2>Where we&apos;re going</H2>
      <p>
        When we open a permanent space, you&apos;ll see it on this page first. Until then: WhatsApp, and we come to you.
      </p>
    </StaticPage>
  );
}
