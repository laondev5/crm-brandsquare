"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Megaphone,
  Settings2,
  Target,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavChild {
  href: string;
  label: string;
  adminOnly?: boolean;
  /** Only the top tier — connecting websites and managing admins. */
  superOnly?: boolean;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  /** A group with an href and no children is a plain link, not a menu. */
  href?: string;
  children?: NavChild[];
  /** Gating for a top-level link. A menu is hidden by its children instead:
   *  it disappears once nothing inside it is visible. */
  adminOnly?: boolean;
  superOnly?: boolean;
}

/**
 * Grouped by the thing you are working on rather than by page. Ten flat links
 * gave no clue that Pipeline and Campaigns are two views of the same leads, or
 * that the team's own work is not a customer's.
 */
const GROUPS: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  {
    label: "Leads",
    icon: Target,
    children: [
      { href: "/leads", label: "All leads" },
      { href: "/pipeline", label: "Pipeline" },
      { href: "/campaigns", label: "Campaigns", adminOnly: true },
      { href: "/email", label: "Email" },
    ],
  },
  {
    label: "Templates",
    icon: FileText,
    children: [
      { href: "/templates/whatsapp", label: "WhatsApp" },
      { href: "/templates/email", label: "Email" },
      { href: "/templates/notes", label: "Notes" },
    ],
  },
  {
    label: "Traffic",
    icon: Activity,
    children: [
      { href: "/analytics", label: "Overview" },
      { href: "/sites", label: "Websites", superOnly: true },
    ],
  },
  {
    label: "Meta",
    icon: Megaphone,
    children: [
      { href: "/whatsapp", label: "WhatsApp inbox" },
      { href: "/whatsapp/settings", label: "WhatsApp settings", superOnly: true },
      { href: "/settings/meta", label: "Ads", superOnly: true },
      { href: "/settings/meta/datasets", label: "Ad datasets", superOnly: true },
    ],
  },
  {
    label: "Team",
    icon: UsersRound,
    children: [
      { href: "/work", label: "My work" },
      { href: "/projects", label: "Projects" },
      { href: "/work/team", label: "Team overview", adminOnly: true },
      { href: "/guide", label: "How this works" },
      { href: "/team", label: "Members", adminOnly: true },
    ],
  },
  // How the CRM itself behaves, as opposed to the work going through it.
  // Last, because it is the section you visit least.
  {
    label: "Settings",
    icon: Settings2,
    children: [{ href: "/settings/stages", label: "Pipeline stages", adminOnly: true }],
  },
];

export default function NavLinks({ isAdmin, isSuper }: { isAdmin: boolean; isSuper?: boolean }) {
  const path = usePathname();

  // The most specific link wins: on /whatsapp/settings only "WhatsApp
  // settings" is lit, not the inbox at /whatsapp as well.
  const matches = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  const best = GROUPS.flatMap((g) => [g.href, ...(g.children ?? []).map((c) => c.href)])
    .filter((h): h is string => !!h && matches(h))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === best;

  const allowed = (x: { adminOnly?: boolean; superOnly?: boolean }) =>
    (isAdmin || !x.adminOnly) && (isSuper || !x.superOnly);

  const visible = GROUPS.filter(allowed)
    .map((g) => ({ ...g, children: g.children?.filter(allowed) }))
    .filter((g) => g.href || (g.children && g.children.length > 0));

  const groupIsActive = (g: (typeof visible)[number]) =>
    g.children?.some((c) => isActive(c.href)) ?? false;

  // Manual toggles are intentionally dropped on navigation, so the menu always
  // settles back to showing where you actually are rather than wherever you
  // last went looking.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setToggled({});
  }, [path]);

  return (
    <nav className="grid gap-0.5" aria-label="Sections">
      {visible.map((g) => {
        const Icon = g.icon;

        if (g.href) {
          const on = isActive(g.href);
          return (
            <Link
              key={g.label}
              href={g.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                on
                  ? "bg-accent font-semibold text-primary"
                  : "font-medium text-[var(--txt)] hover:bg-[#f4f4f8] hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {g.label}
            </Link>
          );
        }

        const active = groupIsActive(g);
        const open = toggled[g.label] ?? active;

        return (
          <div key={g.label}>
            <button
              type="button"
              onClick={() => setToggled((t) => ({ ...t, [g.label]: !open }))}
              aria-expanded={open}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-sm transition-colors",
                active
                  ? "font-semibold text-foreground"
                  : "font-medium text-[var(--txt)] hover:bg-[#f4f4f8] hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{g.label}</span>
              <ChevronDown
                className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {open && (
              <div className="mt-0.5 grid gap-0.5 pl-3">
                {g.children!.map((c) => {
                  const on = isActive(c.href);
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        // The rail makes the indent read as containment rather
                        // than as an arbitrary gap.
                        "border-l-[2px] border-solid py-2 pl-4 text-[13px] transition-colors",
                        on
                          ? "border-primary font-semibold text-primary"
                          : "border-[var(--line)] font-medium text-[var(--txt)] hover:border-[#c9c9d4] hover:text-foreground"
                      )}
                    >
                      {c.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
