import Link from "next/link";
import { SignOut } from "@/components/sign-out";
export function Navbar({ current }: { current?: "overview" | "intake" | "cases" }) {
  return <nav className="nb-navbar" aria-label="Primary navigation"><Link className="nb-brand" href="/">BRANDEX SUITE</Link><div className="nb-nav-links"><Link className={current === "overview" ? "is-current" : ""} href="/">OVERVIEW</Link><Link className={current === "cases" ? "is-current" : ""} href="/cases">CASES & PAYMENTS</Link><Link className={current === "intake" ? "is-current" : ""} href="/intake">CASE INTAKE</Link>{current === "cases" || current === "intake" ? <SignOut /> : <Link href="/login">SIGN IN</Link>}</div></nav>;
}
