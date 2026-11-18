/**
 * The quotation's PDF, kept at its old address.
 *
 * The drawing itself moved to doc-pdf.ts when invoices, receipts and the
 * catalogue joined it — one letterhead, four papers. This file remains so
 * existing callers keep importing from where they always have.
 */
export { BUSINESS, loadLogo, quotePdf, quoteMessage, type Letterhead } from "./doc-pdf";
