import { StaticPage, H2 } from "@/components/site/static-page";

export const metadata = { title: "Sizing" };

export default function SizingPage() {
  return (
    <StaticPage
      eyebrow="Help"
      title="Sizing."
      lede="Our pieces follow standard international women's sizing. The chart below is a starting point — if you're between sizes, message us on WhatsApp and we'll tell you how a specific piece runs."
    >
      <H2>Tops & Dresses</H2>
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full text-[14px] tabular border-t border-ink-300">
          <thead className="caption text-ink-500">
            <tr className="border-b border-ink-300">
              <th className="text-left py-3 px-4">Size</th>
              <th className="text-right py-3 px-4">Bust (cm)</th>
              <th className="text-right py-3 px-4">Waist (cm)</th>
              <th className="text-right py-3 px-4">Hips (cm)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["XS", "80–84", "60–64", "86–90"],
              ["S", "84–88", "64–68", "90–94"],
              ["M", "88–94", "68–74", "94–100"],
              ["L", "94–100", "74–80", "100–106"],
              ["XL", "100–106", "80–86", "106–112"],
            ].map(([s, b, w, h]) => (
              <tr key={s} className="border-b border-ink-300">
                <td className="py-3 px-4 label">{s}</td>
                <td className="py-3 px-4 text-right">{b}</td>
                <td className="py-3 px-4 text-right">{w}</td>
                <td className="py-3 px-4 text-right">{h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2>Bottoms</H2>
      <p>
        For trousers and skirts we list by waist size (<span className="tabular">XS</span>–<span className="tabular">XL</span> map to the same waist measurements above). For a specific cut, ask us — we keep measurement notes for every piece in stock.
      </p>

      <H2>How to measure yourself</H2>
      <ul className="list-disc ml-5 space-y-2">
        <li><strong>Bust</strong> — around the fullest part, tape parallel to the floor.</li>
        <li><strong>Waist</strong> — the narrowest part of your torso, usually just above the navel.</li>
        <li><strong>Hips</strong> — around the fullest part of your hips and seat.</li>
      </ul>

      <H2>Still not sure?</H2>
      <p>
        Send us a WhatsApp message with the piece you&apos;re eyeing and one of your bust/waist measurements. We&apos;ll tell you how that specific piece runs (tight, true, generous) before you commit.
      </p>
    </StaticPage>
  );
}
