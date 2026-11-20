import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "../actions/auth";
import NavLinks from "./nav";
import Palette from "./palette";
import Shell from "./shell";
import MeetingAlerts from "./meeting-alerts";
import PulseProvider from "./pulse";
import NotificationBell from "./bell";
import { isAdminRole, isSuperRole, ROLE_LABEL } from "@/lib/types";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  if (!me) redirect("/login");

  return (
    <PulseProvider>
    <Shell
      bell={<NotificationBell />}
      search={me.role !== "author" && me.role !== "md" ? <Palette isAdmin={isAdminRole(me.role)} /> : undefined}
      homeHref={me.role === "author" ? "/blog" : me.role === "md" ? "/executive" : "/"}
      sidebar={
        <>
          <div className="brand-row">
            <Link href={me.role === "author" ? "/blog" : me.role === "md" ? "/executive" : "/"} className="brand">
              <Image src="/logo-icon.webp" alt="" width={30} height={30} className="brand-mark" priority /> Brandsquare
            </Link>
          </div>
          <div className="workspace-label"><span>BS</span><div><b>BrandSquare CRM</b><small>Connected workspace</small></div></div>

          <NavLinks
            isAdmin={isAdminRole(me.role)}
            isSuper={isSuperRole(me.role)}
            isAuthor={me.role === "author"}
            isMd={me.role === "md"}
          />

          <div className="side-help">
            <b>Everything in one place</b>
            <p>Customer records, sales and your team's next steps.</p>
            <Link href="/guide">Explore the CRM guide <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="side-foot">
            <div className="profile-avatar" aria-hidden="true">{me.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div>
            <div className="who">
              <b>{me.name}</b>
              <span>{ROLE_LABEL[me.role]}</span>
            </div>
            <form action={logoutAction}>
              <button className="signout-button" title="Sign out" aria-label="Sign out">↪</button>
            </form>
          </div>
        </>
      }
    >
      {children}
      <MeetingAlerts />
    </Shell>
    </PulseProvider>
  );
}
