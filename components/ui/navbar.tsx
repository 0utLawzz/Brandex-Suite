import Link from "next/link";
import { SignOut } from "@/components/sign-out";
export function Navbar({ current, role }: { current?: "overview" | "dashboard" | "intake" | "cases" | "templates"; role?: "admin" | "agent" | "viewer" }) {
  return <nav className="nb-navbar" aria-label="Primary navigation"><Link className="nb-brand" href="/">BRANDEX SUITE</Link><div className="nb-nav-links"><Link className={current === "dashboard" ? "is-current" : ""} href="/dashboard">DASHBOARD</Link><Link className={current === "cases" ? "is-current" : ""} href="/cases">{role === "agent" ? "MY CASES" : "CASES & PAYMENTS"}</Link>{(!role || role === "admin") && <Link className={current === "intake" ? "is-current" : ""} href="/intake">CASE INTAKE</Link>}<Link className={current === "templates" ? "is-current" : ""} href="/templates">TEMPLATES</Link>{current && current !== "overview" ? <SignOut /> : <Link href="/login">SIGN IN</Link>}</div></nav>;
}
