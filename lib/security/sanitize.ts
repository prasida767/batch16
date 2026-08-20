/**
 * Lightweight text sanitisation for user-generated content.
 * React already escapes HTML in text nodes — this strips control chars
 * and normalises whitespace so payloads stay readable and bounded.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Strip ASCII control characters (keep newlines / tabs). */
export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

/** Trim, collapse excessive newlines, strip controls. */
export function sanitizeUserText(value: string, maxLength: number): string {
  const cleaned = stripControlChars(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength);
}
