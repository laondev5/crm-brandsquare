import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "../actions/auth";
import NavLinks from "./nav";
import Palette from "./palette";
import Shell from "./shell";

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

          <Palette isAdmin={me.role === "admin"} />

          <NavLinks isAdmin={me.role === "admin"} />

          <div className="side-foot">
            <div className="who">
              <b>{me.name}</b>
              <span>{me.role === "admin" ? "Administrator" : "Sub-admin"}</span>
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
