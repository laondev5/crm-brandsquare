/**
 * Confirms the dashboard can talk to WordPress before you run anything else.
 *
 *   npm run check-api
 */

const BASE = (process.env.WP_API_URL || "").replace(/\/$/, "");
const KEY = process.env.WP_API_KEY || "";

if (!BASE || !KEY) {
  console.error("\n  WP_API_URL or WP_API_KEY is missing from .env.local.");
  console.error("  Both are shown in WordPress under Brandsquare -> Dashboard Access.\n");
  process.exit(1);
}

console.log(`\nChecking ${BASE}`);

async function call(path, params) {
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "X-BSQ-Key": KEY } });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    return { res, body: null, raw: text };
  }
  return { res, body, raw: text };
}

let ping;
try {
  ping = await call("/ping");
} catch (e) {
  console.error(`\n  CANNOT REACH WORDPRESS: ${e.message}`);
  console.error(`
  Check the URL is right and the site is up. WP_API_URL should end in
  /wp-json/bsq/v1 — for example https://brandsquare.shop/wp-json/bsq/v1\n`);
  process.exit(1);
}

if (ping.res.status === 401 || ping.res.status === 403) {
  console.error(`\n  KEY REJECTED (HTTP ${ping.res.status}).`);
  console.error(`  Copy WP_API_KEY again from Brandsquare -> Dashboard Access.\n`);
  process.exit(1);
}

if (ping.res.status === 404) {
  console.error(`\n  ROUTE NOT FOUND (404).`);
  console.error(`
  The plugin is probably not active, or permalinks are set to Plain.
  In WordPress: activate "Brandsquare Quote Form", then Settings -> Permalinks
  and click Save once to flush the rewrite rules.\n`);
  process.exit(1);
}

if (!ping.body) {
  console.error(`\n  NON-JSON RESPONSE (HTTP ${ping.res.status}).`);
  console.error(`  Usually a security plugin or firewall blocking /wp-json.`);
  console.error(`  First 200 characters:\n  ${(ping.raw || "").slice(0, 200)}\n`);
  process.exit(1);
}

console.log(`  OK  reachable, plugin version ${ping.body.plugin}`);

const tables = ping.body.tables || {};
const missing = Object.entries(tables).filter(([, present]) => !present).map(([n]) => n);

if (missing.length) {
  console.error(`\n  MISSING TABLES: ${missing.join(", ")}`);
  console.error(`
  Writes to these fail silently, so the symptom turns up somewhere else —
  a missing sessions table looks like "login bounces back to the login page".

  Fix: deactivate and reactivate the plugin in WordPress, then re-run this.\n`);
  process.exit(1);
}
if (Object.keys(tables).length) console.log(`  OK  all ${Object.keys(tables).length} tables present`);

const [leads, users] = await Promise.all([call("/leads", { per: "1" }), call("/users")]);

if (leads.body) console.log(`  OK  leads endpoint — ${leads.body.total} lead(s) stored`);
else console.log(`  --  leads endpoint returned HTTP ${leads.res.status}`);

if (users.body) {
  const list = users.body.users || [];
  const admins = list.filter((u) => u.role === "admin").length;
  console.log(`  OK  users endpoint — ${list.length} dashboard user(s), ${admins} admin(s)`);
  if (!admins) {
    console.log(`\n  No admin yet. In WordPress: Brandsquare -> Dashboard Access,`);
    console.log(`  then "Create or reset an admin".`);
  }
} else {
  console.log(`  --  users endpoint returned HTTP ${users.res.status}`);
}

console.log("");
