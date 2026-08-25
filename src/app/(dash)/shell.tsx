"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Dashboard frame. On a wide screen this is just the two-column grid the
 * sidebar has always used. Below 900px the sidebar becomes an off-canvas
 * drawer behind a hamburger instead of collapsing into a horizontal strip —
 * a strip pushed the nav links off screen as soon as there were more than a
 * few of them, and hid which page you were on.
 */
export default function Shell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Tapping a nav link should navigate *and* get the drawer out of the way.
  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    // The drawer sits over the page, so the page behind it must not scroll.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    asideRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className={`shell${open ? " is-open" : ""}`}>
      <header className="topbar">
        <button
          ref={burgerRef}
          type="button"
          className="burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="dash-side"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <span className="topbar__title">Brandsquare</span>
      </header>

      <aside id="dash-side" className="side" ref={asideRef} aria-hidden={undefined}>
        {sidebar}
      </aside>

      {/* Only rendered when open, so it can never swallow clicks on desktop. */}
      {open && (
        <button
          type="button"
          className="scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="main">{children}</main>
    </div>
  );
}
