import { jsPDF } from "jspdf";
import { money, type Quote } from "./types";

/**
 * The quotation as a document the customer can keep, print or forward.
 *
 * Drawn in the browser rather than on a server, because the file goes straight
 * from the browser to WordPress anyway — putting it through Vercel would only
 * reintroduce the size limit that sending files had to work around.
 *
 * Standard PDF fonts carry no naira sign, so money here is written with its
 * currency code — "NGN 12,500,000.00" — which is what an invoice would say in
 * any case. The chat message beside it uses the symbol, where it renders.
 */

/** The letterhead every quotation carries. One place to change it. */
export const BUSINESS = { name: "Brandsquare" };

const PAGE_WIDTH = 210; // A4, millimetres
const MARGIN = 16;
const RIGHT = PAGE_WIDTH - MARGIN;
const INK = "#1b1b3a";
const MUTED = "#6b6b7b";
const LINE = "#d8d8e2";

/** Columns, as x positions. Amounts are right-aligned to their own edge. */
const COL_QTY = 118;
const COL_UNIT = 145;
const COL_TOTAL = RIGHT;

export interface Letterhead {
  name: string;
  tagline?: string;
  /** A PNG the PDF can embed, from loadLogo(). */
  logo?: { dataUrl: string; width: number; height: number } | null;
}

/**
 * Reads the organisation's logo into something jsPDF will take.
 *
 * The logo is a WebP, which jsPDF cannot embed, so the browser decodes it and
 * hands back a PNG. It is also why this is async and kept apart from drawing:
 * a quote should still be produced if the logo cannot be loaded.
 */
export async function loadLogo(src = "/logo.webp"): Promise<Letterhead["logo"]> {
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
    // A missing logo is not a reason to refuse a quotation.
    return null;
  }
}

function line(doc: jsPDF, y: number) {
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, RIGHT, y);
}

function readableDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function quotePdf(quote: Quote, business: Letterhead, preparedBy = ""): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const amount = (value: number) => money(value, quote.currency, false);
  const author = preparedBy || quote.created_by_name;

  // ---- the letterhead
  let headerBottom = 24;
  if (business.logo) {
    // Scaled to a fixed height so any logo shape sits on the same baseline.
    const height = 14;
    const width = Math.min(60, (business.logo.width / business.logo.height) * height);
    doc.addImage(business.logo.dataUrl, "PNG", MARGIN, 14, width, height);
    headerBottom = 14 + height;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(INK);
    doc.text(business.name, MARGIN, headerBottom + 6);
    headerBottom += 6;
  } else {
    doc.setTextColor(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(business.name, MARGIN, 24);
  }

  if (business.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text(business.tagline, MARGIN, headerBottom + 5);
    headerBottom += 5;
  }

  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("QUOTATION", RIGHT, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text(quote.ref, RIGHT, 30, { align: "right" });

  const rule = Math.max(headerBottom + 6, 36);
  line(doc, rule);

  // ---- who it is for
  let y = rule + 9;
  doc.setTextColor(MUTED);
  doc.setFontSize(8);
  doc.text("QUOTATION FOR", MARGIN, y);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(quote.customer_name || "—", MARGIN, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  let detailY = y + 11;
  for (const detail of [quote.customer_company, quote.customer_phone, quote.customer_email]) {
    if (!detail) continue;
    doc.text(detail, MARGIN, detailY);
    detailY += 5;
  }

  // Opposite: the dates, and who at this end is behind the quotation. A
  // customer ringing back about it should not have to ask who wrote it.
  const facts: [string, string][] = [["Date", readableDate(quote.issued_on)]];
  if (quote.valid_until) facts.push(["Valid until", readableDate(quote.valid_until)]);
  if (author) facts.push(["Prepared by", author]);

  let factY = y + 6;
  for (const [label, value] of facts) {
    doc.setTextColor(MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(label, RIGHT - 42, factY, { align: "right" });
    doc.setTextColor(INK);
    doc.setFont("helvetica", label === "Prepared by" ? "bold" : "normal");
    doc.text(value, RIGHT, factY, { align: "right" });
    factY += 5.5;
  }
  doc.setFont("helvetica", "normal");

  y = Math.max(detailY, factY) + 6;

  // ---- the lines
  doc.setFillColor("#f5f4f0");
  doc.rect(MARGIN, y, RIGHT - MARGIN, 8, "F");
  doc.setTextColor(MUTED);
  doc.setFontSize(8);
  doc.text("DESCRIPTION", MARGIN + 2, y + 5.5);
  doc.text("QTY", COL_QTY, y + 5.5, { align: "right" });
  doc.text("UNIT PRICE", COL_UNIT, y + 5.5, { align: "right" });
  doc.text("AMOUNT", COL_TOTAL - 2, y + 5.5, { align: "right" });
  y += 12;

  doc.setFontSize(9.5);
  for (const item of quote.items) {
    // A long description wraps rather than running under the figures.
    const wrapped = doc.splitTextToSize(item.description || "—", COL_QTY - MARGIN - 8) as string[];
    const height = Math.max(wrapped.length * 4.6, 6);

    if (y + height > 262) {
      doc.addPage();
      y = 24;
    }

    doc.setTextColor(INK);
    doc.text(wrapped, MARGIN + 2, y);
    doc.setTextColor(MUTED);
    doc.text(String(item.qty), COL_QTY, y, { align: "right" });
    doc.text(amount(item.unit_price), COL_UNIT, y, { align: "right" });
    doc.setTextColor(INK);
    doc.text(amount(item.line_total), COL_TOTAL - 2, y, { align: "right" });

    y += height + 3;
    line(doc, y - 1.5);
  }

  // ---- what it comes to
  y += 5;
  if (y > 250) {
    doc.addPage();
    y = 24;
  }

  const totals: [string, string, boolean][] = [
    ["Subtotal", amount(quote.subtotal), false],
    ...(quote.tax_percent > 0
      ? ([[`VAT ${quote.tax_percent}%`, amount(quote.tax_amount), false]] as [string, string, boolean][])
      : []),
    ["TOTAL", amount(quote.total), true],
  ];

  for (const [label, value, strong] of totals) {
    if (strong) {
      line(doc, y - 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    }
    doc.setTextColor(strong ? INK : MUTED);
    doc.text(label, COL_UNIT, y, { align: "right" });
    doc.setTextColor(INK);
    doc.text(value, COL_TOTAL - 2, y, { align: "right" });
    y += strong ? 8 : 6;
  }

  // ---- signed off
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text([author ? `Prepared by ${author}` : "", quote.ref].filter(Boolean).join("  ·  "), MARGIN, 285);
  doc.text(business.name, RIGHT, 285, { align: "right" });

  return doc.output("blob");
}

/** The same quotation as a WhatsApp message, for sending without an
 *  attachment — WhatsApp renders *this* as bold. */
export function quoteMessage(quote: Quote, businessName: string, preparedBy = ""): string {
  const amount = (value: number) => money(value, quote.currency, true);
  const author = preparedBy || quote.created_by_name;
  const lines: string[] = [`*QUOTATION ${quote.ref}*`, businessName, ""];

  if (quote.customer_name) lines.push(`For: ${quote.customer_name}`);
  if (quote.valid_until) lines.push(`Valid until: ${readableDate(quote.valid_until)}`);
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
