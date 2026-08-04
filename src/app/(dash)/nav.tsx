"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const items = [
    { href: "/", label: "Dashboard" },
    { href: "/leads", label: "Leads" },
    ...(isAdmin ? [{ href: "/team", label: "Team" }] : []),
  ];

  return (
    <nav className="nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={on(i.href) ? "on" : ""}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
