"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Menu, X } from "lucide-react";

const SECTIONS: Record<string, string> = {
  leads: "Leads", organizations: "Companies", deals: "Deals", pipeline: "Lead pipeline",
  quotes: "Quotations", invoices: "Proforma invoices", receipts: "Payment receipts", catalogue: "Machine catalogue",
  tasks: "Tasks", work: "My work", agenda: "Follow-up agenda", requests: "Machine requests", projects: "Projects",
  meetings: "Meetings", announcements: "Announcements", notifications: "Notifications", team: "Team members",
  mail: "Email inbox", whatsapp: "WhatsApp", email: "Email campaigns", templates: "Templates",
  campaigns: "Lead campaigns", blog: "Blog", analytics: "Website analytics", executive: "Executive report",
  settings: "Settings", sites: "Connected websites", guide: "CRM guide", "my-work": "My follow-ups",
};

export default function Shell({ sidebar, bell, search, homeHref = "/", children }: {
  sidebar: React.ReactNode;
  bell?: React.ReactNode;
  search?: React.ReactNode;
  homeHref?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const path = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const segments = path.split("/").filter(Boolean);
  const section = SECTIONS[segments[0]] ?? "Overview";

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => { setMobile(media.matches); if (!media.matches) setOpen(false); };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || !mobile) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); requestAnimationFrame(() => burgerRef.current?.focus()); }
      if (event.key === "Tab") {
        const elements = Array.from(asideRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') ?? []).filter((element) => element.getClientRects().length);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    asideRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [open, mobile]);

  function close() { setOpen(false); requestAnimationFrame(() => burgerRef.current?.focus()); }

  return (
    <div className={`shell${open ? " is-open" : ""}`}>
      <a href="#workspace-content" className="skip-link">Skip to content</a>
      <aside id="dash-side" className="side" ref={asideRef} inert={mobile && !open ? true : undefined} role={mobile && open ? "dialog" : undefined} aria-modal={mobile && open ? true : undefined} aria-label="Workspace navigation">
        <button type="button" className="drawer-close" onClick={close} aria-label="Close menu"><X size={18} /></button>
        {sidebar}
      </aside>
      {open && mobile && <button type="button" className="scrim" aria-label="Close menu" tabIndex={-1} onClick={close} />}
      <div className="workspace-body" inert={mobile && open ? true : undefined}>
        <header className="workspace-topbar">
          <button ref={burgerRef} type="button" className="burger" aria-label="Open menu" aria-expanded={open} aria-controls="dash-side" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="workspace-context"><span>Workspace</span><nav aria-label="Breadcrumb"><Link href={homeHref}>BrandSquare</Link><span aria-hidden="true">/</span>{segments.length > 1 ? <><Link href={`/${segments[0]}`}>{section}</Link><span aria-hidden="true">/</span><b>{segments[1] === "new" ? "Create" : "Details"}</b></> : <b>{section}</b>}</nav></div>
          <div className="workspace-search">{search}</div>
          <Link href="/guide" className="topbar-help" aria-label="CRM help and guide"><HelpCircle size={19} /></Link>
          {bell}
        </header>
        <main className="main" id="workspace-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
