/**
 * A phone number in the form WhatsApp's own links want: the country code, then
 * the number, digits only — 2347082964247, not 0708 296 4247 or +234 708 296 4247.
 *
 * This is the plugin's bsqf_wa_lead_phone() written out again, rule for rule, so
 * a number means the same thing wherever it is read. It is checked against the
 * real PHP function across a table of awkward inputs, so a change to either has
 * to be a change to both. Nigerian numbers are assumed unless a country code is
 * given, because that is who the business writes to.
 *
 * Returns "" for anything that cannot be a phone number, which is what lets a
 * button say "this lead has no number" instead of opening a chat with nobody.
 */
export function waDigits(raw: string | null | undefined, cc = "234"): string {
  let d = String(raw ?? "").replace(/[^\d+]/g, "");
  if (d === "") return "";

  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = cc + d.slice(1);
  else if (!d.startsWith(cc)) d = cc + d;

  d = d.replace(/\D/g, "");
  // "+234 (0) 803 ..." keeps the zero a local dialler drops after the country code.
  // A Nigerian number never has a 0 right after 234, so it is not part of the number.
  if (/^2340\d{10}$/.test(d)) d = "234" + d.slice(4);
  return d.length < 8 || d.length > 15 ? "" : d;
}

/** A chat in WhatsApp (the app, or the web version on a computer), with a message ready to send. */
export function waLink(digits: string, text = ""): string {
  const base = `https://wa.me/${digits}`;
  return text.trim() ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** The original names, kept so nothing that imported them breaks. */
export function toWhatsAppNumber(raw: string, defaultCountryCode = "234"): string | null {
  return waDigits(raw, defaultCountryCode) || null;
}

export function whatsAppLink(rawPhone: string, prefilledText?: string): string | null {
  const number = waDigits(rawPhone);
  return number ? waLink(number, prefilledText ?? "") : null;
}
