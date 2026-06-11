import { getDestinationDigits } from "@/lib/whatsapp";

/**
 * Footer / chrome-friendly WhatsApp button. Pill-shaped, official glyph,
 * no raw phone number in the UI — the number stays inside the wa.me link.
 * Renders nothing if NEXT_PUBLIC_WHATSAPP_NUMBER isn't configured yet.
 */
export function WhatsAppContact({ dark = true }: { dark?: boolean }) {
  const digits = getDestinationDigits();
  if (!digits) return null;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent("Hi M0, I have a question about ")}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`label inline-flex items-center gap-2.5 px-5 py-3 border transition-colors duration-fast ${
        dark
          ? "text-paper border-paper hover:bg-paper hover:text-ink-900"
          : "text-ink-900 border-ink-900 hover:bg-ink-900 hover:text-paper"
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35Z" />
        <path d="M12.05 2C6.55 2 2.08 6.46 2.08 11.95c0 1.76.46 3.47 1.34 4.98L2 22l5.2-1.36a9.96 9.96 0 0 0 4.84 1.23h.01c5.49 0 9.96-4.46 9.96-9.95A9.9 9.9 0 0 0 19.1 4.9 9.9 9.9 0 0 0 12.05 2Zm0 18.19h-.01a8.27 8.27 0 0 1-4.21-1.15l-.3-.18-3.09.81.83-3.01-.2-.31a8.24 8.24 0 0 1-1.27-4.4c0-4.57 3.72-8.28 8.3-8.28a8.23 8.23 0 0 1 5.86 2.43 8.23 8.23 0 0 1 2.42 5.86c0 4.57-3.73 8.28-8.29 8.28Z" />
      </svg>
      <span>Chat with us</span>
    </a>
  );
}