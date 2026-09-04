"use client";

import { useEffect, useRef } from "react";

/**
 * Click density for one page, drawn on a canvas.
 *
 * The x axis is a percentage of viewport width and the y axis is document
 * pixels, which is how the clicks are stored — averaging raw pixel pairs from
 * phones and desktops together produces a map that points at empty space.
 *
 * Canvas rather than SVG because a busy page produces thousands of points, and
 * that many DOM nodes makes the tab crawl.
 */
export default function ClickMap({ points }: { points: { x: number; y: number; w: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  const maxY = points.reduce((m, p) => Math.max(m, p.y), 0) || 1;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Each click is a soft blob; overlapping blobs build up naturally into the
    // hot areas, which is what makes a heatmap readable without binning.
    for (const p of points) {
      const cx = (p.x / 100) * W;
      const cy = (p.y / maxY) * H;
      const r = 16;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(248, 110, 6, 0.30)");
      g.addColorStop(1, "rgba(248, 110, 6, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points, maxY]);

  if (points.length === 0) {
    return (
      <p className="empty" style={{ padding: "26px 0" }}>
        No clicks recorded on this page yet.
      </p>
    );
  }

  return (
    <>
      <div
        style={{
          position: "relative",
          background: "#fafafc",
          border: "1px solid var(--line)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <canvas ref={ref} width={420} height={560} style={{ width: "100%", display: "block" }} />
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
        {points.length.toLocaleString()} clicks. Left to right is across the page; top to bottom is
        how far down. Brighter means more clicks in that spot.
      </p>
    </>
  );
}
