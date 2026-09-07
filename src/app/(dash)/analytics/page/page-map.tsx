"use client";

import { useEffect, useRef, useState } from "react";
import type { PageSnapshot } from "@/lib/types";

/**
 * The heatmap drawn over a saved copy of the page itself.
 *
 * The clicks and the picture have to share one coordinate space or the whole
 * thing lies. They are stored as a percentage across the viewport and an
 * absolute pixel down the document, so the frame is rendered at exactly the
 * width the copy was captured at, and the overlay is sized to match. Scaling
 * happens once, on the pair together, so a dot cannot drift from the button
 * it landed on.
 *
 * Only clicks from screens near that width are plotted. A phone tap at 40%
 * across is a different place on the page from a desktop click at 40% across,
 * and mixing them is exactly how a heatmap ends up pointing at nothing.
 */
export default function PageMap({
  snapshot,
  points,
  requested,
}: {
  snapshot: PageSnapshot;
  points: { x: number; y: number; w: number }[];
  /** The screen shape asked for, which is not always the one that came back. */
  requested: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);

  const W = snapshot.width || 1280;
  // A captured height of zero would collapse the frame; fall back to the
  // deepest click, which is at least guaranteed to contain every dot.
  const H = snapshot.height || points.reduce((m, p) => Math.max(m, p.y), 0) + 400 || 900;

  // Within a quarter of the captured width counts as the same layout. Wider
  // than that and the page has usually reflowed.
  const band = Math.max(120, W * 0.25);
  const mine = points.filter((p) => !p.w || Math.abs(p.w - W) <= band);

  // The frame is laid out at full captured width and then scaled down to fit
  // the card, so the snapshot renders at the width it was taken at rather
  // than reflowing to the panel and moving every element under the dots.
  useEffect(() => {
    const fit = () => {
      const avail = wrap.current?.clientWidth ?? W;
      setScale(Math.min(1, avail / W));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [W]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    for (const p of mine) {
      const cx = (p.x / 100) * W;
      const cy = p.y;
      const r = 22;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(248, 110, 6, 0.55)");
      g.addColorStop(0.5, "rgba(248, 110, 6, 0.22)");
      g.addColorStop(1, "rgba(248, 110, 6, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [mine, W, H]);

  return (
    <>
      {!snapshot.exact && (
        <div className="msg warn" style={{ marginTop: 0 }}>
          No <strong>{requested}</strong> copy of this page has been captured yet, so the{" "}
          <strong>{snapshot.device}</strong> one is shown instead. One is saved automatically the
          next time somebody visits this page on a {requested} screen.
        </div>
      )}

      {/* min-width:0 is load-bearing. A grid child sizes to its content by
          default, so without it the full-width frame stretches the column
          instead of being scaled down into it, and the whole page ends up
          scrolling sideways. */}
      <div
        ref={wrap}
        style={{
          overflow: "hidden",
          borderRadius: 8,
          border: "1px solid var(--line)",
          width: "100%",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: W,
            height: H,
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            // Reserves the scaled height, so the card does not keep a full
            // page's worth of empty space below a shrunken frame.
            marginBottom: H * scale - H,
          }}
        >
          {/* Sandboxed with no allow-scripts: the saved page renders but
              cannot run anything, which is what makes showing a copy of
              someone else's site safe to do at all. */}
          <iframe
            srcDoc={snapshot.html}
            sandbox=""
            title="Saved copy of this page"
            style={{ width: W, height: H, border: 0, display: "block", background: "#fff" }}
          />
          <canvas
            ref={canvas}
            width={W}
            height={H}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0" }}>
        {mine.length.toLocaleString()} of {points.length.toLocaleString()} clicks shown — those made
        on a {snapshot.device}-shaped screen, the shape this copy was captured at ({W}px wide).
        {snapshot.captured_at ? ` Page copied ${fmt(snapshot.captured_at)}.` : ""} The page is a
        saved copy and cannot be interacted with.
      </p>
    </>
  );
}

function fmt(d: string) {
  const dt = new Date(d.replace(" ", "T"));
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
