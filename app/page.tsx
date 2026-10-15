import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/ui/navbar";

export default function OverviewPage() {
  return <><Navbar current="overview" /><main className="theme-shell"><Badge tone="teal">CASE OPERATIONS</Badge><Card><p className="eyebrow">BRANDEX SUITE / WORKSPACE</p><h1>Case operations, together.</h1><p className="muted">Capture client and case details, then manage payments alongside each case.</p><div className="actions"><Link className="nb-button nb-button-accent" href="/cases">CASES & PAYMENTS</Link><Link className="nb-button" href="/intake">OPEN CASE INTAKE</Link></div></Card></main></>;
}
