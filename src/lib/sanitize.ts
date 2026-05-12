import DOMPurify from "isomorphic-dompurify";

/** Catatan teks / rich-ish: simpan HTML aman (tag umum saja, tanpa event handler). */
export function sanitizeNoteHtml(input: string | null | undefined): string | null {
  if (input == null || input === "") return null;
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "ul",
      "ol",
      "li",
      "span",
    ],
    ALLOWED_ATTR: ["class"],
  });
  const t = cleaned.trim();
  return t.length ? t : null;
}

/** Plain string satu baris / pendek — hapus tag, batasi panjang. */
export function sanitizePlainText(
  input: string | null | undefined,
  maxLen: number,
): string | null {
  if (input == null || input === "") return null;
  const stripped = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  const t = stripped.replace(/\s+/g, " ").trim().slice(0, maxLen);
  return t.length ? t : null;
}
