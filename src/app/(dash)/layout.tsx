import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "../actions/auth";
import NavLinks from "./nav";
import Palette from "./palette";
import Shell from "./shell";
import { isAdminRole, ROLE_LABEL } from "@/lib/types";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  if (!me) redirect("/login");

  return (
    <Shell
      sidebar={
        <>
          <Link href="/" className="brand">
            <Image src="/logo-icon.webp" alt="" width={22} height={22} className="brand-mark" priority /> Brandsquare
          </Link>

          <Palette isAdmin={isAdminRole(me.role)} />

          <NavLinks isAdmin={isAdminRole(me.role)} isSuper={me.role === "superadmin"} />

          <div className="side-foot">
            <div className="who">
              <b>{me.name}</b>
              <span>{ROLE_LABEL[me.role]}</span>
            </div>
            <form action={logoutAction}>
              <button className="btn ghost" style={{ width: "100%", justifyContent: "center" }}>
                Sign out
              </button>
            </form>
          </div>
        </>
      }
    >
      {children}
    </Shell>
  );
}
