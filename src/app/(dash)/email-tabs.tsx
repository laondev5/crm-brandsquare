"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * One place for everything email: the shared mailbox, the bulk campaigns that
 * go out from the CRM, and the sender they go out as. They were two separate
 * things under two names; to the person using them it is all "email".
 */
export default function EmailTabs({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();

  const tabs = [
    { href: "/mail", label: "Inbox", on: path === "/mail" || path.startsWith("/mail/") },
    { href: "/email", label: "Campaigns", on: path === "/email" || /^\/email\/\d+/.test(path) },
    { href: "/email/new", label: "New campaign", on: path === "/email/new" },
    ...(isAdmin ? [{ href: "/email/settings", label: "Campaign sender", on: path === "/email/settings" }] : []),
  ];

  return (
    <nav className="mail-tabs mail-tabs--page" aria-label="Email">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.on ? "page" : undefined} className={`mail-tab${t.on ? " is-on" : ""}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
