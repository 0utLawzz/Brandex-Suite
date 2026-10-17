import Link from "next/link";
import { SignOut } from "@/components/sign-out";
type Page="overview"|"dashboard"|"intake"|"cases"|"accounts"|"associates"|"templates"|"guide"|"audit";
export function Navbar({current,role}:{current?:Page;role?:"admin"|"viewer"|"agent"}){
 const links:[Page,string,string][]=[["dashboard","/dashboard","Dashboard"],["cases","/cases","Cases"],...(role==="admin"||!role?[["intake","/new-case","New Case"] as [Page,string,string]]:[]),["accounts","/accounts","Client Ledger"],["associates","/associates","Service Associates"],["templates","/templates","Templates"],["guide","/guide","How to use"]];
 return <nav className="nb-navbar" aria-label="Primary navigation"><Link className="nb-brand" href={role?"/dashboard":"/"}><img src="/brand/brandex-wordmark-navbar.png" alt="Brandex" width="186" height="72"/><span className="nb-suite-label">SUITE</span></Link><div className="nb-nav-links">{links.map(([key,href,label])=><Link key={key} className={current===key?"is-current":""} aria-current={current===key?"page":undefined} href={href}>{label}</Link>)}{role&&current!=="overview"?<SignOut/>:<Link href="/login">SIGN IN</Link>}</div></nav>;
}
