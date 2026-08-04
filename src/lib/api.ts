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

  return body as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>(path, { method: "GET", params }),
  post: <T>(path: string, data?: unknown, params?: Params) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}), params }),
  patch: <T>(path: string, data?: unknown, params?: Params) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data ?? {}), params }),
};

export async function ping() {
  return api.get<{ ok: boolean; plugin: string; time: string }>("/ping");
}
