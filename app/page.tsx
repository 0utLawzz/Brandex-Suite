import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/ui/navbar";

export default function PhaseOnePage() {
  return <><Navbar current="overview" /><main className="theme-shell"><Badge tone="teal">PHASE 1 FOUNDATION</Badge><Card><p className="eyebrow">BRANDEX SUITE / WORKSPACE</p><h1>Case operations, together.</h1><p className="muted">The database, authentication, and row-level security foundation is ready. Continue with the Admin-only case intake.</p><Link className="nb-button nb-button-accent" href="/intake">OPEN CASE INTAKE</Link></Card></main></>;
}
