import { jsPDF } from "jspdf";
import { currency } from "./currencies";
import type {
  Brand,
  CatalogueItem,
  Invoice,
  Quote,
  Receipt,
} from "./types";

/**
 * The four papers the business sends — quotation, proforma invoice, payment
 * receipt and catalogue — drawn from one letterhead.
 *
 * The design is the templates' own: a navy masthead with the logo in a white
 * panel, orange and gold accents, cream note boxes, and tables ruled in pale
 * grey. Only the content changes.
 *
 * Drawn in the browser rather than on a server, because the file goes straight
 * to WordPress from here — putting it through Vercel would reintroduce the
 * size limit that sending files had to work around.
 *
 * Standard PDF fonts carry no naira sign, so NGN is drawn as the letter N with
 * the two strokes through it that make it ₦. Other currencies use their symbol
 * when it is in Latin script and fall back to the ISO code when it is not —
 * a code is never wrong, a missing glyph is.
 */

/* ---------------- the look ---------------- */

const PAGE_W = 210;
const PAGE_H = 297;
const M = 15;
const RIGHT = PAGE_W - M;
const CONTENT = RIGHT - M;
const BOTTOM = 272;

const NAVY = "#071a3a";
const ORANGE = "#ff4e00";
const GOLD = "#ffb202";
const CREAM = "#fff5e6";
const CREAM_DEEP = "#fde8d9";
const BAND = "#f0f2f6";
const SOFT = "#f7f7f9";
const INK = "#1b1b3a";
const MUTED = "#6b6b7b";
const LINE = "#d8d8e2";
const WHITE = "#ffffff";

/** The letterhead's own defaults, used when a caller has no settings to hand. */
export const BUSINESS: Brand = {
  name: "Brandsquare",
  tagline: "Industrial Machinery Solutions",
  website: "www.brandsquare.shop",
  email: "hello@brandsquare.shop",
  signatory_name: "Godwin Ekoh",
  signatory_title: "Managing Director",
};

const DEFAULT_QUOTE_NOTES = [
  "Prices are in the quoted currency. Local currency equivalent will be calculated at the exchange rate on the day of order.",
  "Shipping is NOT included. Brandsquare can arrange shipping and provide a full delivery cost quote upon request.",
  "Import duties, customs clearance and final delivery are NOT included.",
  "Quotation validity: 7 days from the date of this quotation.",
].join("\n");

const DEFAULT_QUOTE_NEXT = "Please reply to confirm your order and we will prepare the full proforma invoice.";
const DEFAULT_INVOICE_NOTES = [
  "This is a Proforma Invoice, not a final commercial invoice.",
  "Order will be processed only after 80% payment is received.",
  "VAT Payment is covered",
].join("\n");
const DEFAULT_INVOICE_NEXT =
  "Please confirm acceptance of this Proforma Invoice and proceed with the 80% deposit. Once payment is received, we will begin processing your order.";
const DEFAULT_RECEIPT_TERMS =
  "80% upfront; the remaining 20% is due when the goods are ready to ship from our warehouse/factory in China to the destination.";

/* ---------------- numbers and dates ---------------- */

function amountText(value: number, minDecimals = 0): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString("en-NG", {
    minimumFractionDigits: minDecimals ? 2 : Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function parseDay(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function longDate(value: string | null): string {
  const d = parseDay(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : (value ?? "");
}

function dashedDate(value: string | null): string {
  const d = parseDay(value);
  if (!d) return value ?? "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** A currency the standard fonts can actually print. */
const SYMBOL_OK = new Set(["$", "€", "£", "¥"]);

function safeSymbol(code: string): string {
  const s = currency(code)?.symbol;
  return s && SYMBOL_OK.has(s) ? s : "";
}

function currencyName(code: string): string {
  return currency(code)?.name ?? code;
}

/* ---------------- text and boxes ---------------- */

type Align = "left" | "right" | "center";

function font(doc: jsPDF, weight: "normal" | "bold", size: number, color = INK) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  doc.setTextColor(color);
}

/** The template's section heading: small, bold, letter-spaced by eye. */
function section(doc: jsPDF, text: string, x: number, y: number, opts: { color?: string; size?: number; gap?: number } = {}) {
  font(doc, "bold", opts.size ?? 10.5, opts.color ?? NAVY);
  let label = text.toUpperCase();
  const room = RIGHT - x;
  if (doc.getTextWidth(label) > room) {
    while (label.length > 1 && doc.getTextWidth(`${label}…`) > room) label = label.slice(0, -1);
    label = `${label.trimEnd()}…`;
  }
  doc.text(label, x, y);
  return y + (opts.gap ?? 6);
}

interface CellStyle {
  fill?: string;
  stroke?: string;
  bold?: boolean;
  size?: number;
  color?: string;
  align?: Align;
  pad?: number;
  middle?: boolean;
}

/** A ruled table cell; pre-wrapped lines keep continuation rows lossless. */
function cell(doc: jsPDF, content: string | string[], x: number, y: number, w: number, h: number, s: CellStyle = {}) {
  if (s.fill) {
    doc.setFillColor(s.fill);
    doc.rect(x, y, w, h, "F");
  }
  if (s.stroke) {
    doc.setDrawColor(s.stroke);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h, "S");
  }
  if (!content.length) return;

  const size = s.size ?? 9;
  const pad = s.pad ?? 2.6;
  font(doc, s.bold ? "bold" : "normal", size, s.color ?? INK);
  const lines = Array.isArray(content) ? content : doc.splitTextToSize(content, w - pad * 2) as string[];
  const lineH = size * 0.3528 * 1.28;
  const first =
    s.middle === false
      ? y + pad + size * 0.3528
      : y + (h - (lines.length - 1) * lineH) / 2 + size * 0.3528 * 0.34;

  const px =
    s.align === "center" ? x + w / 2 : s.align === "right" ? x + w - pad : x + pad;

  lines.forEach((line, i) => {
    doc.text(line, px, first + i * lineH, { align: s.align === "center" ? "center" : s.align ?? "left" });
  });
}

function money(doc: jsPDF, value: number, code: string, xRight: number, y: number, opts: { bold?: boolean; size?: number; color?: string; decimals?: boolean } = {}) {
  const size = opts.size ?? 9.5;
  font(doc, opts.bold ? "bold" : "normal", size, opts.color ?? INK);
  const digits = amountText(value, opts.decimals ? 2 : 0);

  if (code === "NGN") {
    const digitsW = doc.getTextWidth(digits);
    doc.text(digits, xRight, y, { align: "right" });

    const nW = doc.getTextWidth("N");
    const nx = xRight - digitsW - nW - 0.8;
    doc.text("N", nx, y);

    const cap = size * 0.3528 * 0.68;
    doc.setDrawColor(opts.color ?? INK);
    doc.setLineWidth(Math.max(0.1, size * 0.3528 * 0.055));
    doc.line(nx, y - cap * 0.66, nx + nW, y - cap * 0.66);
    doc.line(nx, y - cap * 0.34, nx + nW, y - cap * 0.34);
    doc.setLineWidth(0.2);
    return;
  }

  const symbol = safeSymbol(code);
  doc.text(symbol ? symbol + digits : `${code} ${digits}`, xRight, y, { align: "right" });
}

function paragraph(doc: jsPDF, text: string, x: number, y: number, w: number, size = 9.5, color = INK, gap = 1.25) {
  font(doc, "normal", size, color);
  const lines = doc.splitTextToSize(text, w) as string[];
  const lineH = size * 0.3528 * gap;
  lines.forEach((line, i) => doc.text(line, x, y + i * lineH));
  return y + (lines.length - 1) * lineH;
}

/** A bulleted list; returns the y the next thing may start at. */
function bullets(doc: jsPDF, items: string[], x: number, y: number, w: number, size = 9, color = INK) {
  const lineH = size * 0.3528 * 1.34;
  let cursor = y;
  for (const item of items) {
    font(doc, "normal", size, color);
    const lines = doc.splitTextToSize(item, w - 4.6) as string[];
    doc.text("•", x, cursor);
    lines.forEach((line, i) => doc.text(line, x + 4.6, cursor + i * lineH));
    cursor += lines.length * lineH + 1.5;
  }
  return cursor;
}

/**
 * The cream box the important notes sit in. Orange border, a heading inside
 * it, and as many bullets as the words need.
 */
function creamBox(
  doc: jsPDF,
  heading: string,
  items: string[],
  x: number,
  y: number,
  w: number,
  tone: { fill: string; border: string; heading: string; size?: number; leading?: number; itemGap?: number; pad?: number } = {
    fill: CREAM,
    border: GOLD,
    heading: ORANGE,
  }
): number {
  const size = tone.size ?? 8.8;
  const lineH = size * 0.3528 * (tone.leading ?? 1.34);
  const itemGap = tone.itemGap ?? 1.2;
  const pad = tone.pad ?? 4;
  const headW = w - pad * 2;

  font(doc, "bold", 9.2, tone.heading);
  const headingLines = doc.splitTextToSize(heading, headW) as string[];
  let bodyH = 0;
  const wrapped = items.map((item) => {
    font(doc, "normal", size, INK);
    const lines = doc.splitTextToSize(item, headW - 4.6) as string[];
    bodyH += lines.length * lineH + itemGap;
    return lines;
  });

  const h = pad * 2 + headingLines.length * lineH + 2.4 + bodyH;
  doc.setFillColor(tone.fill);
  doc.setDrawColor(tone.border);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, "FD");

  let cursor = y + pad + 9.2 * 0.3528;
  headingLines.forEach((line, i) => {
    font(doc, "bold", 9.2, tone.heading);
    doc.text(line, x + pad, cursor + i * lineH);
  });
  cursor += headingLines.length * lineH + 2.4;

  wrapped.forEach((lines) => {
    font(doc, "normal", size, INK);
    doc.text("•", x + pad, cursor);
    lines.forEach((line, i) => doc.text(line, x + pad + 4.6, cursor + i * lineH));
    cursor += lines.length * lineH + itemGap;
  });

  return y + h;
}

/* ---------------- the letterhead ---------------- */

function letterhead(doc: jsPDF, brand: Letterhead, title: string): number {
  // The navy masthead, edge to edge inside the margins.
  doc.setFillColor(NAVY);
  doc.rect(M, 14, CONTENT, 33, "F");

  // The logo sits in a white panel, the same shape whatever the image is.
  const panel = { x: M + 4, y: 18, w: 36, h: 25 };
  doc.setFillColor(WHITE);
  doc.rect(panel.x, panel.y, panel.w, panel.h, "F");

  if (brand.logo) {
    const scale = Math.min((panel.w - 5) / brand.logo.width, (panel.h - 5) / brand.logo.height);
    const w = brand.logo.width * scale;
    const h = brand.logo.height * scale;
    doc.addImage(
      brand.logo.dataUrl,
      "PNG",
      panel.x + (panel.w - w) / 2,
      panel.y + (panel.h - h) / 2,
      w,
      h
    );
  } else {
    // No image is not a reason for a blank panel; the name goes in it.
    let size = 13;
    font(doc, "bold", size, NAVY);
    while (size > 8 && doc.getTextWidth(brand.name) > panel.w - 6) {
      size -= 0.5;
      font(doc, "bold", size, NAVY);
    }
    doc.text(brand.name, panel.x + panel.w / 2, panel.y + panel.h / 2 + size * 0.3528 * 0.35, {
      align: "center",
    });
  }

  // The title, right aligned, in the space the panel leaves.
  font(doc, "bold", 18, WHITE);
  doc.text(title, RIGHT - 2, 29.8, { align: "right" });
  if (brand.tagline) {
    font(doc, "normal", 8.8, "#d9ddea");
    doc.text(brand.tagline, RIGHT - 2, 36.6, { align: "right" });
  }

  // Website and email, gold labels against white values.
  const parts: { label: string; value: string }[] = [];
  if (brand.website) parts.push({ label: "Website: ", value: brand.website });
  if (brand.email) parts.push({ label: "Email: ", value: brand.email });

  if (parts.length) {
    let cursor = RIGHT - 3;
    const y = 44;
    for (let i = parts.length - 1; i >= 0; i--) {
      font(doc, "normal", 7.8, WHITE);
      const vw = doc.getTextWidth(parts[i].value);
      doc.text(parts[i].value, cursor, y, { align: "right" });
      cursor -= vw;

      font(doc, "bold", 7.8, GOLD);
      const lw = doc.getTextWidth(parts[i].label);
      cursor -= lw;
      doc.text(parts[i].label, cursor, y);

      if (i > 0) {
        cursor -= 5;
        font(doc, "normal", 7.8, "#8f98ad");
        doc.text("|", cursor + 2, y);
        cursor -= 3;
      }
    }
  }

  return 54;
}

/** The one line at the foot of every page. */
function footers(doc: jsPDF, brand: Brand, note?: string) {
  const pages = doc.getNumberOfPages();
  const parts = [brand.name, brand.website, brand.email].filter(Boolean);
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font(doc, "normal", 7, MUTED);
    doc.text(parts.join("  •  "), PAGE_W / 2, 289, { align: "center" });
    if (note) doc.text(note, PAGE_W / 2, 293, { align: "center" });
  }
  doc.setPage(pages);
}

function newPage(doc: jsPDF, y: number, need: number): number {
  if (y + need <= BOTTOM) return y;
  doc.addPage();
  return 24;
}

/** Split one logical row, not one item per page. Only its first fragment has money. */
function continuationRow(
  doc: jsPDF,
  y: number,
  columns: { text?: string; x: number; w: number; style?: CellStyle }[],
  layout: {
    height: (lines: number) => number;
    header: (y: number) => number;
    first?: (y: number, h: number, multiline: boolean) => void;
  }
): number {
  const wrapped = columns.map(({ text = "", w, style = {} }) => {
    const size = style.size ?? 9;
    const pad = style.pad ?? 2.6;
    font(doc, style.bold ? "bold" : "normal", size, style.color ?? INK);
    return { lines: text ? doc.splitTextToSize(text, w - pad * 2) as string[] : [], size, pad };
  });
  const lineCount = Math.max(1, ...wrapped.map(({ lines }) => lines.length));
  const multiline = lineCount > 1;
  // Retain the templates' compact single-line heights. For wrapped text, also
  // honour cell()'s actual top padding, baseline and line spacing.
  const height = (count: number) => Math.max(layout.height(count), ...wrapped.map(({ size, pad }) =>
    multiline ? pad * 2 + size * 0.3528 + (count - 1) * size * 0.3528 * 1.28 : 0
  ));

  let offset = 0;
  while (offset < lineCount) {
    const nextY = newPage(doc, y, height(1));
    if (nextY !== y) y = layout.header(nextY);

    let count = 1;
    while (count < lineCount - offset && y + height(count + 1) <= BOTTOM) count++;
    const h = height(count);
    columns.forEach(({ x, w, style }, i) => {
      cell(doc, wrapped[i].lines.slice(offset, offset + count), x, y, w, h, {
        ...style, middle: multiline ? false : style?.middle,
      });
    });
    if (offset === 0) layout.first?.(y, h, multiline);
    y += h;
    offset += count;
    if (offset < lineCount) {
      y = layout.header(newPage(doc, BOTTOM, height(1)));
    }
  }
  return y;
}

/* ---------------- the quotation ---------------- */

export interface Letterhead extends Brand {
  logo?: { dataUrl: string; width: number; height: number } | null;
}

export function quotePdf(quote: Quote, business: Letterhead, preparedBy = ""): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const brand: Letterhead = { ...BUSINESS, ...business };
  const author = preparedBy || quote.created_by_name;
  const cur = quote.currency || "NGN";

  let y = letterhead(doc, brand, "QUOTATION");

  // ---- the date, and who it is for
  const metaW = [62, CONTENT - 62];
  cell(doc, "DATE", M, y, metaW[0], 8, { fill: BAND, stroke: LINE, bold: true, size: 8.4, color: NAVY, align: "center" });
  cell(doc, "PREPARED FOR", M + metaW[0], y, metaW[1], 8, { fill: BAND, stroke: LINE, bold: true, size: 8.4, color: NAVY, align: "center" });
  y += 8;

  const metaH = 14;
  cell(doc, longDate(quote.issued_on), M, y, metaW[0], metaH, { stroke: LINE, size: 9.4, middle: true });
  cell(doc, "", M + metaW[0], y, metaW[1], metaH, { stroke: LINE });

  // Name and company on two lines, then the contact details smaller.
  const forLines = [quote.customer_name || "—", quote.customer_company].filter(Boolean);
  font(doc, "bold", 9.6, INK);
  doc.text(forLines[0], M + metaW[0] + 2.8, y + 5.6);
  if (forLines[1]) {
    font(doc, "normal", 8.6, MUTED);
    doc.text(forLines[1], M + metaW[0] + 2.8, y + 9.6);
  }
  const contact = [quote.customer_email, quote.customer_phone].filter(Boolean).join("  ·  ");
  if (contact) {
    font(doc, "normal", 7.8, MUTED);
    doc.text(contact, M + metaW[0] + 2.8, y + 13);
  }
  y += metaH + 10;

  // ---- machine details
  const firstItem = quote.items[0];
  const firstLine = (firstItem?.description ?? "").split(/\r?\n/)[0] || "Machinery";
  // Catalogue descriptions can start with a whole paragraph. Keep headings
  // short; the complete, unabridged description is in the pricing table.
  const machineName = firstLine.length > 80 ? `${firstLine.slice(0, 77).trimEnd()}...` : firstLine;
  const description =
    quote.details ||
    (quote.items.length > 1 ? quote.items.map((i) => i.description).filter(Boolean).join("\n") : "");
  const suitable = quote.suitable_for.trim();

  const detailRows: [string, string][] = [["MACHINE NAME", machineName]];
  if (description) detailRows.push(["DESCRIPTION", description]);
  if (suitable) detailRows.push(["SUITABLE FOR", suitable]);

  y = newPage(doc, y, 17);
  y = section(doc, "Machine details", M, y);
  const labelW = 68;
  for (const [label, value] of detailRows) {
    y = continuationRow(doc, y, [
      { text: label, x: M, w: labelW, style: { fill: SOFT, stroke: LINE, bold: true, size: 8.8, color: INK } },
      { text: value, x: M + labelW, w: CONTENT - labelW, style: { stroke: LINE, size: 9, middle: false } },
    ], {
      height: (n) => Math.max(10, n * 4.4 + 6),
      header: (top) => section(doc, `Machine details — ${label} (continued)`, M, top),
    });
  }
  y += 9;

  // ---- what it costs
  y = newPage(doc, y, 24);
  y = section(doc, `Model & pricing (${cur})`, M, y);
  const priceW = [96, 50, 34];
  const priceHeader = (top: number) => {
    cell(doc, "ITEM", M, top, priceW[0], 8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, "NOTES", M + priceW[0], top, priceW[1], 8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, `PRICE (${cur})`, M + priceW[0] + priceW[1], top, priceW[2], 8, {
      fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center",
    });
    return top + 8;
  };
  y = priceHeader(y);

  quote.items.forEach((item, i) => {
    const itemNote = item.note
      ? `${item.qty !== 1 ? `Qty ${item.qty}\n` : ""}${item.note}`
      : item.qty !== 1 ? `Qty ${item.qty}` : "";
    y = continuationRow(doc, y, [
      { text: item.description || "—", x: M, w: priceW[0], style: { stroke: LINE, size: 9 } },
      { text: itemNote, x: M + priceW[0], w: priceW[1], style: { stroke: LINE, size: 8.8, color: MUTED } },
      { x: M + priceW[0] + priceW[1], w: priceW[2], style: { stroke: LINE, fill: i % 2 ? SOFT : WHITE } },
    ], {
      height: (n) => Math.max(10, n * 4.4 + 5.6),
      header: priceHeader,
      first: (top, h, multiline) => money(doc, item.line_total, cur, RIGHT - 2.4,
        top + (multiline ? 2.6 + 9 * 0.3528 : h / 2 + 1.2), { bold: true, size: 9.5, color: ORANGE }),
    });
  });

  // Totals: the same table, with the label column merged.
  const totalRows: [string, number][] = [];
  if (quote.tax_percent > 0) {
    totalRows.push(["Subtotal", quote.subtotal]);
    totalRows.push([`VAT ${quote.tax_percent}%`, quote.tax_amount]);
  }
  totalRows.push(["TOTAL", quote.total]);

  for (const [label, value] of totalRows) {
    const strong = label === "TOTAL";
    y = newPage(doc, y, 10);
    cell(doc, "", M, y, priceW[0] + priceW[1], 10, { stroke: LINE, fill: strong ? SOFT : WHITE });
    font(doc, "bold", 9.4, strong ? NAVY : MUTED);
    doc.text(label, RIGHT - priceW[2] - 3, y + 6.4, { align: "right" });
    cell(doc, "", M + priceW[0] + priceW[1], y, priceW[2], 10, { stroke: LINE, fill: strong ? SOFT : WHITE });
    money(doc, value, cur, RIGHT - 2.4, y + 6.4, {
      bold: true,
      size: strong ? 11 : 9.4,
      color: strong ? ORANGE : INK,
    });
    y += 10;
  }
  y += 10;

  // ---- key specifications
  if (quote.specs.trim()) {
    y = newPage(doc, y, 20);
    const shortName = machineName.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    y = section(doc, `Key specifications — ${shortName}`, M, y);
    y = bullets(doc, quote.specs.split("\n").filter(Boolean), M, y + 1, CONTENT, 9.2);
    y += 8;
  }

  // ---- important notes
  const notes = (quote.notes || DEFAULT_QUOTE_NOTES).split("\n").map((s) => s.trim()).filter(Boolean);
  let notesHeading = "IMPORTANT NOTES";
  let noteItems = notes;
  if (notes.length > 1 && notes[0].length <= 78 && !notes[0].startsWith("•")) {
    notesHeading = notes[0];
    noteItems = notes.slice(1);
  }

  // Keep the unchanged notes box and its heading together after long rows.
  const noteLineH = 8.8 * 0.3528 * 1.34;
  font(doc, "bold", 9.2, ORANGE);
  const noteHeadingH = doc.splitTextToSize(notesHeading, CONTENT - 8).length * noteLineH;
  font(doc, "normal", 8.8, INK);
  const noteBodyH = noteItems.reduce((h, text) => h + doc.splitTextToSize(text, CONTENT - 12.6).length * noteLineH + 1.2, 0);
  y = newPage(doc, y, 6 + 8 + noteHeadingH + 2.4 + noteBodyH);
  y = section(doc, "Important notes", M, y);
  y = creamBox(doc, notesHeading, noteItems, M, y, CONTENT);
  y += 10;

  // ---- next step
  if (quote.next_step || DEFAULT_QUOTE_NEXT) {
    y = newPage(doc, y, 24);
    y = section(doc, "Next step", M, y);
    paragraph(doc, quote.next_step || DEFAULT_QUOTE_NEXT, M, y + 2, CONTENT, 9.4);
  }

  footers(doc, brand, "Thank you for your interest.");
  return doc.output("blob");
}

/** The same quotation as a WhatsApp message, for sending without an
 *  attachment — WhatsApp renders *this* as bold. */
export function quoteMessage(quote: Quote, businessName: string, preparedBy = ""): string {
  const amount = (value: number) => {
    const symbol = currency(quote.currency)?.symbol;
    const figure = amountText(value);
    return symbol && !SYMBOL_OK.has(symbol) ? `${quote.currency} ${figure}` : `${symbol ?? quote.currency + " "}${figure}`;
  };
  const author = preparedBy || quote.created_by_name;
  const lines: string[] = [`*QUOTATION ${quote.ref}*`, businessName, ""];

  if (quote.customer_name) lines.push(`For: ${quote.customer_name}`);
  if (quote.valid_until) lines.push(`Valid until: ${longDate(quote.valid_until)}`);
  lines.push("");

  quote.items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.description || "—"}`);
    lines.push(`   ${item.qty} × ${amount(item.unit_price)} = ${amount(item.line_total)}`);
  });

  lines.push("");
  lines.push(`Subtotal: ${amount(quote.subtotal)}`);
  if (quote.tax_percent > 0) lines.push(`VAT ${quote.tax_percent}%: ${amount(quote.tax_amount)}`);
  lines.push(`*TOTAL: ${amount(quote.total)}*`);
  if (author) {
    lines.push("");
    lines.push(`Prepared by ${author}`);
  }

  return lines.join("\n");
}

/* ---------------- the proforma invoice ---------------- */

export function invoicePdf(inv: Invoice, business: Letterhead): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const brand: Letterhead = { ...BUSINESS, ...business };
  const cur = inv.currency || "NGN";

  let y = letterhead(doc, brand, "PROFORMA INVOICE");

  // ---- the four facts
  const facts = [
    ["Date", longDate(inv.issued_on)],
    ["Proforma No.", inv.invoice_no],
    ["Valid Until", longDate(inv.valid_until)],
    ["Currency", cur],
  ] as const;
  const col = CONTENT / 4;
  facts.forEach(([label, value], i) => {
    cell(doc, label, M + i * col, y, col, 8, {
      fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center",
    });
  });
  y += 8;
  facts.forEach(([, value], i) => {
    cell(doc, value, M + i * col, y, col, 11.5, {
      stroke: LINE, size: 9.2, bold: i === 1, align: "center",
    });
  });
  y += 11.5 + 9;

  // ---- bill to
  y = section(doc, "Bill to", M, y, { color: ORANGE, size: 9.5 });
  const billW = [30, CONTENT - 30];
  const bill: [string, string][] = [["Name", [inv.customer_name, inv.customer_company].filter(Boolean).join(" — ")]];
  if (inv.customer_location) bill.push(["Location", inv.customer_location]);
  if (inv.customer_phone) bill.push(["Phone", inv.customer_phone]);
  if (inv.customer_email) bill.push(["Email", inv.customer_email]);

  for (const [label, value] of bill) {
    const rh = 9;
    y = newPage(doc, y, rh);
    cell(doc, label, M, y, billW[0], rh, { stroke: LINE, bold: true, size: 8.8 });
    cell(doc, value || "—", M + billW[0], y, billW[1], rh, { stroke: LINE, size: 9 });
    y += rh;
  }
  y += 10;

  // ---- the lines
  y = newPage(doc, y, 27);
  y = section(doc, "Item details", M, y, { color: ORANGE, size: 9.5 });
  const itemW = [81, 25, 38, 36];
  const xQty = M + itemW[0];
  const xUnit = xQty + itemW[1];
  const xTotal = xUnit + itemW[2];

  const itemHeader = (top: number) => {
    cell(doc, "Description", M, top, itemW[0], 8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, "Quantity", xQty, top, itemW[1], 8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, "Unit Price", xUnit, top, itemW[2], 8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, "Total", xTotal, top, itemW[3], 8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    return top + 8;
  };
  y = itemHeader(y);

  inv.items.forEach((item, i) => {
    const fill = i % 2 ? SOFT : WHITE;
    y = continuationRow(doc, y, [
      { text: item.description || "—", x: M, w: itemW[0], style: { stroke: LINE, size: 9, fill } },
      { text: String(item.qty), x: xQty, w: itemW[1], style: { stroke: LINE, size: 9, align: "center", fill } },
      { x: xUnit, w: itemW[2], style: { stroke: LINE, fill } },
      { x: xTotal, w: itemW[3], style: { stroke: LINE, fill } },
    ], {
      height: (n) => Math.max(13, n * 4.6 + 6),
      header: itemHeader,
      first: (top, h, multiline) => {
        const baseline = top + (multiline ? 2.6 + 9 * 0.3528 : h / 2 + 1.2);
        money(doc, item.unit_price, cur, xTotal - 2.4, baseline, { size: 9.2, decimals: true });
        money(doc, item.line_total, cur, RIGHT - 2.4, baseline, { bold: true, size: 9.4, decimals: true });
      },
    });
  });

  // Grand total, with the money column kept beside the figures above.
  y = newPage(doc, y, 11);
  cell(doc, "", M, y, xTotal - M, 11, { stroke: LINE });
  font(doc, "bold", 10.5, NAVY);
  doc.text("GRAND TOTAL", xTotal - 5, y + 7.2, { align: "right" });
  cell(doc, "", xTotal, y, itemW[3], 11, { stroke: LINE });
  money(doc, inv.total, cur, RIGHT - 2.4, y + 7.2, { bold: true, size: 10.5, color: ORANGE, decimals: true });
  y += 11 + 10;

  // ---- payment terms
  const terms = (inv.payment_terms || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (terms.length) {
    y = newPage(doc, y, 18);
    y = section(doc, "Payment terms", M, y, { color: ORANGE, size: 9.5 });
    y = bullets(doc, terms, M, y, CONTENT, 9.2);
    y += 8;
  }

  // ---- bank details
  const bank: [string, string][] = [
    ["Bank Name", inv.bank_name],
    ["Account Name", inv.bank_account_name],
    ["Account Number", inv.bank_account_number],
    ["Swift Code", inv.bank_swift],
    ["Currency", inv.bank_currency],
  ].filter(([, value]) => !!value) as [string, string][];

  if (bank.length) {
    y = newPage(doc, y, bank.length * 9 + 16);
    y = section(doc, "Bank details", M, y, { color: ORANGE, size: 9.5 });
    for (const [label, value] of bank) {
      y = newPage(doc, y, 9);
      cell(doc, label, M, y, 42, 9, { stroke: LINE, bold: true, size: 8.8 });
      cell(doc, value, M + 42, y, CONTENT - 42, 9, { stroke: LINE, size: 9 });
      y += 9;
    }
    y += 12;
  }

  // ---- the two notes blocks
  const notes = (inv.notes || DEFAULT_INVOICE_NOTES).split("\n").map((s) => s.trim()).filter(Boolean);
  if (notes.length) {
    y = newPage(doc, y, 34);
    y = creamBox(doc, "IMPORTANT NOTES", notes, M, y, CONTENT, {
      fill: CREAM_DEEP, border: ORANGE, heading: ORANGE,
    });
    y += 10;
  }

  if (inv.next_step || DEFAULT_INVOICE_NEXT) {
    y = newPage(doc, y, 24);
    y = section(doc, "Next step", M, y, { color: ORANGE, size: 9.5 });
    paragraph(doc, inv.next_step || DEFAULT_INVOICE_NEXT, M, y + 2, CONTENT, 9.4);
  }

  footers(doc, brand);
  return doc.output("blob");
}

/* ---------------- the payment receipt ---------------- */

export function receiptPdf(rec: Receipt, business: Letterhead): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const brand: Letterhead = { ...BUSINESS, ...business };
  const cur = rec.currency || "NGN";
  const hasTotal = rec.order_total > 0;
  const share = hasTotal
    ? rec.share_percent > 0
      ? rec.share_percent
      : Math.min(100, Math.round((rec.amount_received / rec.order_total) * 10000) / 100)
    : 0;
  const balance = rec.balance ?? Math.max(0, rec.order_total - rec.amount_received);
  const balanceShare = hasTotal ? Math.max(0, Math.round((100 - share) * 100) / 100) : 0;

  let y = letterhead(doc, brand, "PAYMENT RECEIPT");

  // ---- the four facts
  const facts = [
    ["RECEIPT NO.", rec.receipt_no, true],
    ["RECEIPT DATE", dashedDate(rec.receipt_date), false],
    ["PAYMENT DATE", dashedDate(rec.payment_date), false],
    ["CURRENCY", `${currencyName(cur)} (${cur})`, false],
  ] as const;
  const col = CONTENT / 4;
  facts.forEach(([label], i) => {
    cell(doc, label, M + i * col, y, col, 7, {
      fill: BAND, stroke: LINE, bold: true, size: 8, color: NAVY, align: "center",
    });
  });
  y += 7;
  facts.forEach(([, value, strong], i) => {
    cell(doc, value, M + i * col, y, col, 9, {
      stroke: LINE, size: 9.2, bold: strong, align: "center",
    });
  });
  y += 9 + 4;

  // ---- the amount, in the band
  const bandH = 14;
  const leftW = CONTENT * 0.56;
  doc.setFillColor(NAVY);
  doc.rect(M, y, leftW, bandH, "F");
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CONTENT, bandH, "S");
  doc.rect(M + leftW, y, CONTENT - leftW, bandH, "S");

  font(doc, "bold", 12.5, WHITE);
  doc.text("AMOUNT RECEIVED", M + 4, y + 6.2);
  font(doc, "normal", 7.8, "#c9d1e1");
  doc.text(rec.summary || (hasTotal ? `${share}% payment received` : "Payment received"), M + 4, y + 10.8);

  money(doc, rec.amount_received, cur, RIGHT - 6, y + 10.6, {
    bold: true, size: 17, color: GOLD, decimals: true,
  });
  y += bandH + 8;

  // ---- who paid
  y = section(doc, "Received from", M, y, { gap: 4.5 });
  const rw = [40, 50, 40, 50];
  const pairs: [string, string, string, string][] = [
    ["CUSTOMER NAME", rec.customer_name || "—", "PHONE NUMBER", rec.customer_phone || "—"],
    ["EMAIL ADDRESS", rec.customer_email || "—", "PAYMENT METHOD", rec.payment_method || "—"],
  ];
  for (const [l1, v1, l2, v2] of pairs) {
    y = newPage(doc, y, 6.8);
    cell(doc, l1, M, y, rw[0], 6.8, { stroke: LINE, fill: SOFT, bold: true, size: 8.2 });
    cell(doc, v1, M + rw[0], y, rw[1], 6.8, { stroke: LINE, size: 8.8 });
    cell(doc, l2, M + rw[0] + rw[1], y, rw[2], 6.8, { stroke: LINE, fill: SOFT, bold: true, size: 8.2 });
    cell(doc, v2, M + rw[0] + rw[1] + rw[2], y, rw[3], 6.8, { stroke: LINE, size: 8.8 });
    y += 6.8;
  }
  y += 7;

  // ---- the order
  y = newPage(doc, y, 18.3);
  y = section(doc, "Order details", M, y, { gap: 4.5 });
  const ow = [CONTENT - 62, 27, 35];
  const orderHeader = (top: number) => {
    cell(doc, "ITEM", M, top, ow[0], 6.8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, "QTY", M + ow[0], top, ow[1], 6.8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, `ORDER TOTAL (${cur})`, M + ow[0] + ow[1], top, ow[2], 6.8, {
      fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center",
    });
    return top + 6.8;
  };
  y = orderHeader(y);

  const lines = rec.items.length
    ? rec.items
    : [{ description: rec.summary || "Payment received", qty: 1, line_total: rec.order_total || rec.amount_received }];

  lines.forEach((item) => {
    y = continuationRow(doc, y, [
      { text: item.description || "—", x: M, w: ow[0], style: { stroke: LINE, size: 9 } },
      { text: String(item.qty), x: M + ow[0], w: ow[1], style: { stroke: LINE, size: 9, align: "center" } },
      { x: M + ow[0] + ow[1], w: ow[2], style: { stroke: LINE } },
    ], {
      height: (n) => n === 1 ? 7 : n * 4.4 + 5.6,
      header: orderHeader,
      first: (top, _h, multiline) => money(doc, item.line_total, cur, RIGHT - 2.4,
        top + (multiline ? 2.6 + 9 * 0.3528 : 4.6), { bold: true, size: 9.2, color: ORANGE, decimals: true }),
    });
  });
  y += 7;

  // ---- payment summary
  // Only where there is an order total to divide: a receipt written by hand
  // for money received on its own has no share and no balance to show.
  if (hasTotal) {
    y = newPage(doc, y, 4.5 + 6.8 * 4);
    y = section(doc, "Payment summary", M, y, { gap: 4.5 });
    const sw = [CONTENT - 94, 27, 37, 30];
    const xSummaryAmount = M + sw[0] + sw[1] + sw[2];
    cell(doc, "DESCRIPTION", M, y, sw[0], 6.8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, "SHARE", M + sw[0], y, sw[1], 6.8, { fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center" });
    cell(doc, `AMOUNT (${cur})`, M + sw[0] + sw[1], y, sw[2], 6.8, {
      fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center",
    });
    cell(doc, "STATUS", xSummaryAmount, y, sw[3], 6.8, {
      fill: NAVY, bold: true, size: 8.6, color: WHITE, align: "center",
    });
    y += 6.8;

    const summaryRows: [string, string, number, string, boolean][] = [
      ["Total order value (contract value)", "100%", rec.order_total, "—", false],
      [`Upfront payment (this receipt)`, `${amountText(share)}%`, rec.amount_received, "RECEIVED", true],
      ["Balance remaining", `${amountText(balanceShare)}%`, balance, "PENDING", false],
    ];
    for (const [label, shareText, amount, status, strong] of summaryRows) {
      y = newPage(doc, y, 6.8);
      const fill = strong ? CREAM : WHITE;
      cell(doc, label, M, y, sw[0], 6.8, { stroke: LINE, size: 9, bold: strong, fill });
      cell(doc, shareText, M + sw[0], y, sw[1], 6.8, { stroke: LINE, size: 9, align: "center", fill });
      cell(doc, "", M + sw[0] + sw[1], y, sw[2], 6.8, { stroke: LINE, fill });
      money(doc, amount, cur, xSummaryAmount - 2.4, y + 4.6, { bold: strong, size: 9.2, color: strong ? ORANGE : INK, decimals: true });
      cell(doc, status, xSummaryAmount, y, sw[3], 6.8, {
        stroke: LINE, size: 8.4, bold: status !== "—", align: "center", fill,
      });
      y += 6.8;
    }
    y += 2;
  }

  // ---- the terms in a sentence
  const terms = rec.terms || DEFAULT_RECEIPT_TERMS;
  font(doc, "bold", 8.6, INK);
  const termsX = M + doc.getTextWidth("Payment terms:") + 2;
  font(doc, "normal", 8.6, INK);
  const termLines = doc.splitTextToSize(terms, CONTENT - (termsX - M)) as string[];
  const termsH = Math.max(8, termLines.length * 4.1 + 3) + 4;
  y = newPage(doc, y, termsH);
  font(doc, "bold", 8.6, INK);
  doc.text("Payment terms:", M, y + 4);
  font(doc, "normal", 8.6, INK);
  termLines.forEach((line, i) => doc.text(line, termsX, y + 4 + i * 4.1));
  y += termsH;

  // ---- important notes
  const firstLine = (rec.customer_company || rec.customer_name || "the customer").trim();
  const itemWord = lines.length === 1 ? "one (1) item" : `${lines.length} items`;
  const custom = rec.notes.split("\n").map((s) => s.trim()).filter(Boolean);
  const shareClause = hasTotal
    ? ` (${amountText(share)}% of the total order value of ${currencyPrefix(cur)}${amountText(rec.order_total, 2)})`
    : "";
  const noteItems = [
    `${brand.name} confirms receipt of ${currencyPrefix(cur)}${amountText(rec.amount_received, 2)}${shareClause} from ${firstLine} toward ${itemWord} listed above.`,
    ...(hasTotal
      ? [`The remaining balance of ${currencyPrefix(cur)}${amountText(balance, 2)} (${amountText(balanceShare)}%) is due when the goods are ready to ship from our warehouse/factory in China to the destination.`]
      : []),
    "Ownership of the machine transfers fully only after the balance has been paid in full and confirmed by " + brand.name + ".",
    "This is a payment receipt for the deposit received. It is not a final commercial invoice for the full order value.",
    "Shipping, import duties and last-mile delivery (if applicable) are as agreed in the related quotation / proforma invoice for this order.",
    `Please keep this receipt and quote Receipt No. ${rec.receipt_no} in all correspondence regarding this order.`,
    ...custom,
  ];

  const statusHeading = `PAYMENT STATUS: ${hasTotal ? `${amountText(share)}% RECEIVED | ${amountText(balanceShare)}% BALANCE OUTSTANDING` : "RECEIVED"}`;
  // Reserve the existing cream box's actual height after a continued order,
  // including its section heading (same metrics as creamBox below).
  const noteLineH = 8.2 * 0.3528 * 1.28;
  font(doc, "bold", 9.2, ORANGE);
  const noteHeadingH = doc.splitTextToSize(statusHeading, CONTENT - 6).length * noteLineH;
  font(doc, "normal", 8.2, INK);
  const noteBodyH = noteItems.reduce((h, text) => h + doc.splitTextToSize(text, CONTENT - 10.6).length * noteLineH + 0.9, 0);
  y = newPage(doc, y, 4.5 + 6 + noteHeadingH + 2.4 + noteBodyH);
  y = section(doc, "Important notes & terms", M, y, { gap: 4.5 });
  y = creamBox(
    doc,
    statusHeading,
    noteItems,
    M,
    y,
    CONTENT,
    { fill: CREAM, border: GOLD, heading: ORANGE, size: 8.2, leading: 1.28, itemGap: 0.9, pad: 3 }
  );
  y += 5;

  // ---- signed off
  y = newPage(doc, y, 18);
  font(doc, "bold", 9, INK);
  doc.text("Signed:", M, y + 2);
  font(doc, "bold", 8.8, INK);
  doc.text(`Name: ${rec.created_by_name || brand.signatory_name || ""}`, M, y + 8.4);
  const signatory = rec.created_by_name || brand.signatory_name;
  const title = brand.signatory_title || "";
  font(doc, "normal", 8.8, INK);
  doc.text(`Position: ${title}`, M, y + 13);

  if (signatory) {
    const paymentLine = `Payment of ${currencyPrefix(cur)}${amountText(rec.amount_received, 2)} received.`;
    font(doc, "normal", 8.2, MUTED);
    doc.text(paymentLine, M, y + 18);
  }

  font(doc, "bold", 8.8, INK);
  doc.text(`Date: ${dashedDate(rec.receipt_date)}`, RIGHT, y + 13, { align: "right" });

  footers(doc, brand, "Thank you for your business. This is an official payment receipt.");
  return doc.output("blob");
}

/** A figure with its symbol for running text; NGN's glyph is not in the PDF
 *  fonts, so running text writes the code instead. */
function currencyPrefix(code: string): string {
  const s = safeSymbol(code);
  return s ? s : `${code} `;
}

/* ---------------- the catalogue ---------------- */

export function cataloguePdf(items: CatalogueItem[], business: Letterhead): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const brand: Letterhead = { ...BUSINESS, ...business };

  let y = letterhead(doc, brand, "PRODUCT CATALOGUE");

  font(doc, "normal", 8.8, MUTED);
  doc.text(
    "Industrial machinery for milling, processing, packaging and production. Prices are list prices and exclude shipping.",
    M,
    y
  );
  y += 12;

  // Grouped by category, the way a buyer reads a catalogue.
  const groups = new Map<string, CatalogueItem[]>();
  for (const item of items) {
    const key = item.category || "Machinery";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const widths = [58, 30, 62, 30];
  const xModel = M + widths[0];
  const xSpec = xModel + widths[1];
  const xPrice = xSpec + widths[2];

  for (const [category, group] of groups) {
    y = newPage(doc, y, 24);
    doc.setFillColor(NAVY);
    doc.rect(M, y, CONTENT, 8, "F");
    font(doc, "bold", 9.2, WHITE);
    doc.text(category.toUpperCase(), M + 3, y + 5.6);
    y += 8;

    cell(doc, "MACHINE", M, y, widths[0], 7.5, { fill: BAND, stroke: LINE, bold: true, size: 8, color: NAVY });
    cell(doc, "MODEL", xModel, y, widths[1], 7.5, { fill: BAND, stroke: LINE, bold: true, size: 8, color: NAVY });
    cell(doc, "KEY SPECIFICATIONS", xSpec, y, widths[2], 7.5, {
      fill: BAND, stroke: LINE, bold: true, size: 8, color: NAVY,
    });
    cell(doc, "PRICE", xPrice, y, widths[3], 7.5, { fill: BAND, stroke: LINE, bold: true, size: 8, color: NAVY });
    y += 7.5;

    group.forEach((item, i) => {
      const spec = [item.description, item.specs].filter(Boolean).join("\n");
      font(doc, "normal", 8.6, INK);
      const nameLines = doc.splitTextToSize(item.name || "—", widths[0] - 5.2) as string[];
      const specLines = doc.splitTextToSize(spec || "—", widths[2] - 5.2) as string[];
      const rh = Math.max(12, Math.max(nameLines.length, specLines.length, 1) * 4.1 + 6);
      y = newPage(doc, y, rh);

      const fill = i % 2 ? SOFT : WHITE;
      cell(doc, item.name || "—", M, y, widths[0], rh, { stroke: LINE, size: 9, bold: true, fill });
      cell(doc, item.model || "—", xModel, y, widths[1], rh, { stroke: LINE, size: 8.6, fill });
      cell(doc, spec || "—", xSpec, y, widths[2], rh, { stroke: LINE, size: 8.4, color: MUTED, fill });
      cell(doc, "", xPrice, y, widths[3], rh, { stroke: LINE, fill });
      money(doc, item.price, item.currency || "USD", RIGHT - 2.4, y + rh / 2 + 1.2, {
        bold: true, size: 9.4, color: ORANGE,
      });
      y += rh;
    });

    y += 8;
  }

  if (!items.length) {
    paragraph(doc, "No machines have been added to the catalogue yet.", M, y + 4, CONTENT, 10, MUTED);
  }

  footers(doc, brand, "Prices and availability are subject to change without notice.");
  return doc.output("blob");
}

// Documents use the coloured artwork from the approved receipt, not the white website wordmark.
export async function loadLogo(src = "/logo-document.png"): Promise<Letterhead["logo"]> {
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("logo"));
      img.src = src;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    // A missing logo is not a reason to refuse a document.
    return null;
  }
}
