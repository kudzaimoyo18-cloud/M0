import { getDisplayNumber } from "@/lib/whatsapp";

/**
 * Footer / chrome-friendly link to chat with M0 on WhatsApp. Renders nothing
 * if NEXT_PUBLIC_WHATSAPP_NUMBER isn't configured yet.
 */
export function WhatsAppContact({ dark = true }: { dark?: boolean }) {
  const display = getDisplayNumber();
  if (!display) return null;
  const digits = display.replace(/[^\d]/g, "");
  const url = `https://wa.me/${digits}?text=${encodeURIComponent("Hi M0, I have a question about ")}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`label inline-flex items-center gap-2 border-b pb-1 hover:opacity-80 transition-opacity duration-fast ${dark ? "text-paper border-paper" : "text-ink-900 border-ink-900"}`}
    >
      <span aria-hidden>↗</span>
      <span>WhatsApp {display}</span>
    </a>
  );
}
