import Link from "next/link";

/** How many rows a document list shows at a time. */
export const PAGE_SIZE = 10;

/** Page 1 shows no `page` in the URL, so a filtered list starts clean. */
export function pageHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

/**
 * What of a fetched list belongs on this page.
 *
 * A current plugin is asked for one page and answers with `total`; an older
 * one ignores the window, returns its cap and has no total, so the list is
 * sliced here instead. Both arrive at the same rows and page count.
 */
export function pageOf<T>(fetched: T[], total: number | undefined, requested: number) {
  const counted = typeof total === "number" ? total : fetched.length;
  const pageCount = Math.max(1, Math.ceil(counted / PAGE_SIZE));
  const page = Math.min(Math.max(1, requested), pageCount);
  const rows =
    typeof total === "number"
      ? fetched
      : fetched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { rows, total: counted, page, pageCount };
}

/** 1 … 4 5 6 … 12 — enough to move, not so many that the row of numbers is noise. */
function pageNumbers(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push("…");
  for (let n = start; n <= end; n++) out.push(n);
  if (end < pageCount - 1) out.push("…");
  out.push(pageCount);
  return out;
}

/**
 * The foot of a document table: which rows are on screen, and the way to the
 * rest. Links rather than buttons, so a page can be opened, bookmarked and
 * shared, and the filters survive the move.
 */
export default function TablePager({
  page,
  pageCount,
  total,
  basePath,
  params,
  label,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
  label: string;
}) {
  if (pageCount <= 1) return null;

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(total, page * PAGE_SIZE);

  return (
    <nav className="pager" aria-label={`${label} pages`}>
      <span className="pager__info">
        {first}–{last} of {total}
      </span>

      <div className="pager__nav">
        <Link
          href={pageHref(basePath, params, Math.max(1, page - 1))}
          className={`pager__btn${page === 1 ? " is-off" : ""}`}
          aria-disabled={page === 1}
          tabIndex={page === 1 ? -1 : undefined}
        >
          Previous
        </Link>

        {pageNumbers(page, pageCount).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="pager__gap" aria-hidden="true">…</span>
          ) : (
            <Link
              key={n}
              href={pageHref(basePath, params, n)}
              className={`pager__btn${n === page ? " is-on" : ""}`}
              aria-current={n === page ? "page" : undefined}
              aria-label={`Page ${n}`}
            >
              {n}
            </Link>
          )
        )}

        <Link
          href={pageHref(basePath, params, Math.min(pageCount, page + 1))}
          className={`pager__btn${page === pageCount ? " is-off" : ""}`}
          aria-disabled={page === pageCount}
          tabIndex={page === pageCount ? -1 : undefined}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
