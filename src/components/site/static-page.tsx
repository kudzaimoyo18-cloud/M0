import Link from "next/link";

/**
 * Shared chrome for static / editorial pages (About, Help, Legal, etc.).
 * Centered narrow column, Cormorant heading, Inter body. Optional lede.
 */
export function StaticPage({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-section">
      {eyebrow && <p className="label text-ink-500 mb-3">{eyebrow}</p>}
      <h1 className="font-display text-section md:text-display leading-tight">{title}</h1>
      {lede && <p className="text-ink-500 mt-4 text-[15px] leading-relaxed max-w-measure">{lede}</p>}
      <div className="mt-10 max-w-measure space-y-5 text-[15px] leading-relaxed text-ink-900">
        {children}
      </div>
      <p className="mt-16 caption text-ink-500">
        Questions? <Link href="/" className="underline underline-offset-4">Return home</Link>, or message us on WhatsApp from the footer.
      </p>
    </article>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-section mt-12 mb-3">{children}</h2>;
}

export function Rule() {
  return <hr className="border-ink-300 my-8" />;
}
