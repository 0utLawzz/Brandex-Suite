import Link from "next/link";
export function Navbar({ current }: { current?: "overview" | "intake" }) {
  return <nav className="nb-navbar" aria-label="Primary navigation"><Link className="nb-brand" href="/">BRANDEX SUITE</Link><div className="nb-nav-links"><Link className={current === "overview" ? "is-current" : ""} href="/">OVERVIEW</Link><Link className={current === "intake" ? "is-current" : ""} href="/intake">CASE INTAKE</Link></div></nav>;
}
