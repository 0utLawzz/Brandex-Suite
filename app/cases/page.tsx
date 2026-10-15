import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, role } = await requireStaff();
  const query = await searchParams;
  const page = /^\d{1,6}$/.test(query.page ?? "") ? Math.max(1, Number(query.page)) : 1;
  const { data: cases, error } = await supabase.from("cases").select("id, case_prefix, case_number, stage, status, origin").order("created_at", { ascending: false }).order("id").range((page - 1) * 30, page * 30);
  if (error) throw new Error("Could not load cases. Please try again.");
  return <><Navbar current="cases" /><main className="phase-page"><div className="page-top"><div><p className="eyebrow">BRANDEX SUITE / {role}</p><h1>Cases & payments</h1><p className="muted">{role === "agent" ? "Your assigned cases." : "Open a case to view its ledger alongside case status."}</p></div>{role === "admin" && <Link className="nb-button nb-button-accent" href="/intake">NEW CASE</Link>}</div><Card>
    {cases.length ? <div className="table-scroll"><table className="nb-table"><caption className="sr-only">Accessible cases</caption><thead><tr><th>CASE</th><th>ORIGIN</th><th>STAGE</th><th>STATUS</th></tr></thead><tbody>{cases.slice(0, 30).map(record => <tr key={record.id}><td><Link href={`/cases/${record.id}`}>{record.case_prefix}-{record.case_number}</Link></td><td>{record.origin}</td><td>{record.stage}</td><td><Badge>{record.status}</Badge></td></tr>)}</tbody></table></div> : <p>No cases found.</p>}
    <div className="actions">{page > 1 && <Link className="nb-button" href={`/cases?page=${page - 1}`}>PREVIOUS</Link>}{cases.length > 30 && <Link className="nb-button" href={`/cases?page=${page + 1}`}>NEXT</Link>}</div>
  </Card></main></>;
}
