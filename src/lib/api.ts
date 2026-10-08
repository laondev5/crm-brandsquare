import "server-only";

/**
 * The dashboard cannot reach MySQL — it is bound to 127.0.0.1 on the
 * WordPress host — so everything goes through the plugin's REST API instead.
 *
 * The shared key is read from the environment and never reaches the browser:
 * every caller of this module runs on the server.
 */

const BASE = (process.env.WP_API_URL || "").replace(/\/$/, "");
const KEY = process.env.WP_API_KEY || "";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Params = Record<string, string | number | null | undefined>;

/**
 * Staff names are typed by whoever invited them, in whatever case, and then show
 * up in dozens of places: who a lead is assigned to, who wrote a note, who sent
 * an email. Every one should read the same way, so it is put right once, here,
 * on the way in -- not in each screen that happens to remember to.
 *
 * Only the first letter of each word is raised; the rest is left as written, so
 * "McDonald" and "Okeke-Eze" survive. Lead and customer names are not touched:
 * they are the customer's own spelling.
 */
const PERSON_KEYS = new Set([
  "actor_name", "assigned_name", "created_by_name", "updated_by_name", "edited_by_name", "deleted_by_name",
  "uploaded_by_name", "author_name", "organizer_name", "owner_name", "blocker_owner_name", "procurement_name",
  "sales_name", "sent_by", "created_by",
]);

export function properName(s: string): string {
  return s.replace(/(^|[\s-])(\p{Ll})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function tidyNames(v: unknown): unknown {
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = tidyNames(v[i]);
    return v;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    // A person record: an id, a name and a role. A lead has no role.
    const isPerson = typeof o.name === "string" && typeof o.role === "string" && "id" in o;
    // An assignment in a timeline names the person it was given to.
    const isHandover = o.type === "assigned" || o.type === "assigned_procurement" || o.type === "assigned_sales";
    for (const k of Object.keys(o)) {
      const val = o[k];
      if (
        typeof val === "string" &&
        (PERSON_KEYS.has(k) || (isPerson && k === "name") || (isHandover && (k === "to_value" || k === "from_value")))
      )
        o[k] = properName(val);
      else if (val && typeof val === "object") o[k] = tidyNames(val);
    }
  }
  return v;
}

function url(path: string, params?: Params) {
  const u = new URL(BASE + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

async function request<T>(path: string, init: RequestInit & { params?: Params } = {}): Promise<T> {
  if (!BASE || !KEY) {
    throw new ApiError("WP_API_URL or WP_API_KEY is not set. Copy .env.example to .env.local.", 500);
  }

  const { params, ...rest } = init;

  let res: Response;
  try {
    res = await fetch(url(path, params), {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        "X-BSQ-Key": KEY,
        ...(rest.headers || {}),
      },
      // Lead data changes constantly; a cached response would show stale rows.
      cache: "no-store",
    });
  } catch (e: any) {
    throw new ApiError(`Could not reach WordPress at ${BASE}. ${e?.message ?? ""}`.trim(), 503);
  }

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // A WAF block or a PHP fatal returns HTML, not JSON — say so plainly
    // rather than surfacing "Unexpected token <".
    throw new ApiError(
      `WordPress returned a non-JSON response (HTTP ${res.status}). Check that the plugin is active and the URL is right.`,
      res.status || 502
    );
  }

  if (!res.ok) {
    throw new ApiError(body?.message || `Request failed (HTTP ${res.status})`, res.status, body?.code || "");
  }

  return tidyNames(body) as T;
}

/**
 * A multipart POST, for the one endpoint that takes a file.
 *
 * Content-Type is deliberately omitted: fetch generates it from the FormData
 * along with the boundary, and setting it by hand produces a body PHP cannot
 * parse — $_FILES arrives empty and the upload fails with no useful error.
 */
async function upload<T>(path: string, form: FormData, params?: Params): Promise<T> {
  if (!BASE || !KEY) {
    throw new ApiError("WP_API_URL or WP_API_KEY is not set. Copy .env.example to .env.local.", 500);
  }

  let res: Response;
  try {
    res = await fetch(url(path, params), {
      method: "POST",
      headers: { "X-BSQ-Key": KEY },
      body: form,
      cache: "no-store",
    });
  } catch (e: any) {
    throw new ApiError(`Could not reach WordPress at ${BASE}. ${e?.message ?? ""}`.trim(), 503);
  }

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // An upload rejected by the host rather than by WordPress — mod_security,
    // or a size limit — comes back as an HTML error page.
    throw new ApiError(
      `The upload was refused before it reached WordPress (HTTP ${res.status}). It may be larger than the server allows.`,
      res.status || 502
    );
  }

  if (!res.ok) {
    throw new ApiError(body?.message || `Upload failed (HTTP ${res.status})`, res.status, body?.code || "");
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>(path, { method: "GET", params }),
  post: <T>(path: string, data?: unknown, params?: Params) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}), params }),
  patch: <T>(path: string, data?: unknown, params?: Params) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data ?? {}), params }),
  del: <T>(path: string, data?: unknown, params?: Params) =>
    request<T>(path, { method: "DELETE", body: JSON.stringify(data ?? {}), params }),
  upload,
};

export async function ping() {
  return api.get<{ ok: boolean; plugin: string; time: string }>("/ping");
}
