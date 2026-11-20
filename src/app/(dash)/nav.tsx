"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, BriefcaseBusiness, ChevronDown, FileText, LayoutDashboard, Megaphone, MessagesSquare, Settings2, UsersRound } from "lucide-react";

interface NavChild {
  href: string;
  label: string;
  adminOnly?: boolean;
  superOnly?: boolean;
  blog?: boolean;
  author?: boolean;
  md?: boolean;
}

interface NavGroup extends Omit<NavChild, "href"> {
  icon: typeof LayoutDashboard;
  href?: string;
  children?: NavChild[];
}

const GROUPS: NavGroup[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/" },
  {
    label: "CRM", icon: UsersRound,
    children: [
      { href: "/leads", label: "Leads" },
      { href: "/organizations", label: "Companies", md: true },
      { href: "/deals", label: "Deals" },
      { href: "/pipeline", label: "Lead pipeline" },
    ],
  },
  {
    label: "Communications", icon: MessagesSquare,
    children: [
      { href: "/mail", label: "Email inbox" },
      { href: "/whatsapp", label: "WhatsApp inbox" },
      { href: "/templates/whatsapp", label: "WhatsApp templates" },
      { href: "/templates/email", label: "Email templates" },
      { href: "/templates/notes", label: "Note templates" },
      { href: "/templates/responses", label: "Response templates" },
      { href: "/templates/faq", label: "FAQs" },
    ],
  },
  {
    label: "Documents", icon: FileText,
    children: [
      { href: "/quotes", label: "Quotations", md: true },
      { href: "/invoices", label: "Proforma invoices", md: true },
      { href: "/receipts", label: "Payment receipts", md: true },
      { href: "/catalogue", label: "Machine catalogue", md: true },
    ],
  },
  {
    label: "Work & team", icon: BriefcaseBusiness,
    children: [
      { href: "/tasks", label: "Tasks" },
      { href: "/agenda", label: "Follow-up agenda" },
      { href: "/work", label: "My work", author: true, md: true },
      { href: "/requests", label: "Machine requests", md: true },
      { href: "/projects", label: "Projects", author: true },
      { href: "/meetings", label: "Meetings", author: true, md: true },
      { href: "/announcements", label: "Announcements", author: true, md: true },
      { href: "/notifications", label: "Notifications", author: true, md: true },
      { href: "/work/team", label: "Team overview", adminOnly: true },
      { href: "/team", label: "Team members", adminOnly: true },
    ],
  },
  {
    label: "Marketing", icon: Megaphone,
    children: [
      { href: "/campaigns", label: "Lead campaigns", adminOnly: true, author: true, md: true },
      { href: "/email", label: "Email campaigns" },
      { href: "/blog", label: "Blog posts", blog: true },
      { href: "/blog/categories", label: "Blog categories", blog: true },
      { href: "/settings/meta", label: "Meta ads", author: true, md: true },
    ],
  },
  {
    label: "Reports", icon: BarChart3,
    children: [
      { href: "/executive", label: "Executive report", adminOnly: true, md: true },
      { href: "/analytics", label: "Website analytics", author: true, md: true },
      { href: "/blog/analytics", label: "Blog analytics", blog: true },
    ],
  },
  {
    label: "Settings", icon: Settings2,
    children: [
      { href: "/settings/stages", label: "Pipeline stages", adminOnly: true },
      { href: "/settings/lead-properties", label: "Lead properties", adminOnly: true },
      { href: "/settings/documents", label: "Document settings", adminOnly: true },
      { href: "/settings/request-sources", label: "Request sources", adminOnly: true },
      { href: "/settings/responses", label: "Response templates", adminOnly: true },
      { href: "/settings/faq", label: "FAQs", adminOnly: true },
      { href: "/email/settings", label: "Campaign sender", adminOnly: true },
      { href: "/whatsapp/settings", label: "WhatsApp settings", superOnly: true },
      { href: "/settings/meta/datasets", label: "Ad datasets", superOnly: true },
      { href: "/meetings/settings", label: "Google account", superOnly: true },
      { href: "/sites", label: "Connected websites", superOnly: true },
    ],
  },
];

export default function NavLinks({ isAdmin, isSuper, isAuthor = false, isMd = false }: {
  isAdmin: boolean;
  isSuper?: boolean;
  isAuthor?: boolean;
  isMd?: boolean;
}) {
  const path = usePathname();
  const params = useSearchParams();
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const query = params.toString();

  useEffect(() => { setExpanded(undefined); }, [path, query]);

  const allowed = (item: Omit<NavChild, "href" | "label">) => isMd
    ? !!item.md
    : isAuthor
      ? !!(item.blog || item.author)
      : (isAdmin || !item.adminOnly) && (isSuper || !item.superOnly) && (isAdmin || !item.blog);
  const visible = GROUPS.map((group) => ({ ...group, children: group.children?.filter(allowed) }))
    .filter((group) => group.children ? group.children.length > 0 : allowed(group));
  const best = visible.flatMap((group) => [group.href, ...(group.children ?? []).map((child) => child.href)])
    .filter((href): href is string => !!href && (href === "/" ? path === "/" : path === href || path.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="workspace-nav" aria-label="Main navigation">
      <span className="nav-caption">Workspace</span>
      {visible.map((group) => {
        const Icon = group.icon;
        const active = group.href === best || !!group.children?.some((child) => child.href === best);
        if (group.href) return (
          <Link key={group.label} href={group.href} className={`nav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon size={18} aria-hidden="true" /><span>{group.label}</span>
          </Link>
        );
        const open = expanded === undefined ? active : expanded === group.label;
        const id = `nav-${group.label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
        return (
          <div key={group.label} className="nav-group">
            <button type="button" className={`nav-item${active ? " is-active" : ""}`} aria-expanded={open} aria-controls={id} onClick={() => setExpanded(open ? null : group.label)}>
              <Icon size={18} aria-hidden="true" /><span>{group.label}</span><ChevronDown size={14} className={open ? "is-rotated" : ""} aria-hidden="true" />
            </button>
            <div id={id} className="nav-children" hidden={!open}>
              {group.children!.map((child) => (
                <Link key={child.href} href={child.href} className={child.href === best ? "is-active" : ""} aria-current={child.href === best ? "page" : undefined}>{child.label}</Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
