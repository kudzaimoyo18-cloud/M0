import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getDisplayNumber } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  let order = null;
  if (ref) {
    try {
      const db = await getDb();
      order = (await db.select().from(schema.orders).where(eq(schema.orders.reference, ref)).limit(1))[0] ?? null;
    } catch {
      /* ignore — surface the page anyway */
    }
  }

  const whatsappNumber = getDisplayNumber();

  return (
    <div className="min-h-[70svh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-section">Order received.</h1>
        {ref && <p className="mt-4 text-ink-500 tabular">Reference {ref}</p>}
        <p className="mt-6 text-ink-700 text-[14px] leading-relaxed">
          We&apos;ve opened WhatsApp with your order summary. Continue the conversation there to confirm delivery time and cash on delivery.
        </p>
        {whatsappNumber && <p className="caption text-ink-500 mt-4 tabular">{whatsappNumber}</p>}
        <div className="mt-8 flex flex-col gap-3 items-center">
          {order && (
            <Link href={`/track?ref=${encodeURIComponent(order.reference)}&email=${encodeURIComponent(order.email)}`} className="btn-secondary">
              Track order
            </Link>
          )}
          <Link href="/" className="label underline underline-offset-4">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
