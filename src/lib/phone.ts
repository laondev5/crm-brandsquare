/**
 * Converts a lead's phone number to the digits-only international format
 * wa.me links require (e.g. "0803 123 4567" -> "2348031234567").
 *
 * Leads are entered by hand or imported from spreadsheets, so this has to
 * cope with spaces, dashes, brackets and a leading "+" or "00" — not just
 * the clean format a web form would enforce.
 */
export function toWhatsAppNumber(raw: string, defaultCountryCode = "234"): string | null {
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    // Local format — 0803... becomes 234803... (leading 0 dropped, not kept)
    digits = defaultCountryCode + digits.slice(1);
  } else if (!digits.startsWith(defaultCountryCode)) {
    // No leading 0, no +, no country code already present — assume local.
    digits = defaultCountryCode + digits;
  }

  // A real phone number is at least 8 digits; anything shorter is noise
  // (a partial paste, a landline extension) and not worth linking to.
  if (digits.length < 8 || digits.length > 15) return null;

  return digits;
}

export function whatsAppLink(rawPhone: string, prefilledText?: string): string | null {
  const number = toWhatsAppNumber(rawPhone);
  if (!number) return null;
  const q = prefilledText ? `?text=${encodeURIComponent(prefilledText)}` : "";
  return `https://wa.me/${number}${q}`;
}
