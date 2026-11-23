/**
 * A stand-in for WordPress that pages the document lists.
 *
 * The live plugin ignores `limit`/`offset`, so the dashboard's windowed path
 * (slice + `total` + past-the-end redirect) cannot be reached against it. This
 * answers the three list endpoints the way 1.40.1 will — honouring limit,
 * offset, status and search — and proxies everything else, auth included, to
 * the real site so the pages render as they really do.
 *
 * Run with the project's env so the live URL and key are not hard-coded:
 *   node --env-file=.env.local scripts/stub-wp.mjs
 */
import http from "node:http";

const LIVE = (process.env.WP_API_URL || "").replace(/\/$/, "");
const KEY = process.env.WP_API_KEY || "";
const PORT = Number(process.env.STUB_PORT) || 4010;

const QUOTE_STATUS = ["draft", "sent", "accepted", "declined"];
const INVOICE_STATUS = ["draft", "sent", "accepted", "part_paid", "paid", "cancelled"];

/** Only the fields the list pages read; newest first, like `id DESC`. */
const quote = (n) => ({
  id: n,
  ref: `QT-${String(n).padStart(3, "0")}`,
  customer_name: `Customer ${n}`,
  customer_company: `Company ${n}`,
  currency: "NGN",
  issued_on: "2026-11-20",
  valid_until: "2026-12-04",
  total: 100000 * n,
  status: "draft",
  status_label: "Draft",
  created_by_name: "Fixture Rep",
});

const invoice = (n) => ({
  ...quote(n),
  invoice_no: `BS-PI-2026-${String(n).padStart(3, "0")}`,
});

const receipt = (n) => ({
  id: n,
  receipt_no: `BS-RCP-2026-${String(n).padStart(3, "0")}`,
  invoice_no: "",
  customer_name: `Customer ${n}`,
  customer_company: `Company ${n}`,
  currency: "NGN",
  receipt_date: "2026-11-20",
  amount_received: 50000 * n,
  payment_method: "Bank transfer",
  created_by_name: "Fixture Rep",
});

const QUOTES = Array.from({ length: 23 }, (_, k) => quote(23 - k));
const INVOICES = Array.from({ length: 12 }, (_, k) => invoice(12 - k));
const RECEIPTS = Array.from({ length: 3 }, (_, k) => receipt(3 - k));

function countsOf(rows, statuses) {
  const counts = { all: rows.length };
  for (const key of statuses) counts[key] = rows.filter((r) => r.status === key).length;
  return counts;
}

function filtered(rows, params) {
  const status = params.get("status") || "";
  const q = (params.get("q") || "").trim().toLowerCase();
  return rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (!q) return true;
    return [r.ref, r.invoice_no, r.receipt_no, r.customer_name, r.customer_company]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
}

/** The 1.40.1 contract: a clamped window and the filtered total behind it. */
function windowed(rows, params) {
  const limit = Math.max(1, Math.min(200, Number(params.get("limit")) || 200));
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  return { rows: rows.slice(offset, offset + limit), total: rows.length };
}

/** Each list endpoint's payload: the window, its total, and the tab counts. */
const ENDPOINTS = {
  "/quotes": (params) => {
    const { rows, total } = windowed(filtered(QUOTES, params), params);
    return { quotes: rows, total, counts: countsOf(QUOTES, QUOTE_STATUS) };
  },
  "/invoices": (params) => {
    const { rows, total } = windowed(filtered(INVOICES, params), params);
    return { invoices: rows, total, counts: countsOf(INVOICES, INVOICE_STATUS) };
  },
  "/receipts": (params) => {
    const { rows, total } = windowed(filtered(RECEIPTS, params), params);
    return { receipts: rows, total };
  },
};

const json = (res, body, status = 200) => {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text) });
  res.end(text);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/\/$/, "");
  const list = req.method === "GET" ? ENDPOINTS[path] : null;

  if (list) return json(res, list(url.searchParams));

  // Everything else — auth, notifications, settings — is the real site's
  // business, so it is passed straight through.
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  try {
    const upstream = await fetch(LIVE + path + url.search, {
      method: req.method,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
        "X-BSQ-Key": KEY,
      },
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    });
    res.end(await upstream.text());
  } catch (e) {
    json(res, { code: "stub_upstream", message: String(e?.message || e) }, 502);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Stub WordPress on http://127.0.0.1:${PORT} → ${LIVE}`);
});
