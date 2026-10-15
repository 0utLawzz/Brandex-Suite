import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { loadWorkspace, loadAgents, filterCases, agentLabel } from "@/lib/workspace";
import { formatAmount } from "@/lib/ledger";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; origin?: string; assignment?: string; status?: string }> }) {
  const { supabase, role } = await requireStaff();
  const query = await searchParams;
  const [workspace, agents] = await Promise.all([loadWorkspace(supabase), role === "admin" ? loadAgents(supabase) : Promise.resolve([])]);
  const filtered = filterCases(workspace.cases, query);
  const pages = Math.max(1, Math.ceil(filtered.length / 30));
  const page = Math.min(pages, /^\d{1,6}$/.test(query.page ?? "") ? Math.max(1, Number(query.page)) : 1);
  const pageLink = (number: number) => { const params = new URLSearchParams(); for (const key of ["q", "origin", "assignment", "status"] as const) if (query[key]) params.set(key, query[key]); params.set("page", String(number)); return `/cases?${params}`; };
  return <><Navbar current="cases" role={role} /><main className="phase-page"><div className="page-top"><div><p className="eyebrow">BRANDEX SUITE / {role}</p><h1>{role === "agent" ? "My cases" : "Cases & payments"}</h1><p className="muted">{role === "agent" ? "Review and assess your assigned cases." : "Case status and payments in one place."}</p></div>{role === "admin" && <Link className="nb-button nb-button-accent" href="/intake">NEW CASE</Link>}</div><Card>
    <form action="/cases" className="case-filters"><div className="field"><label htmlFor="q">SEARCH CASE / CLIENT</label><input className="nb-input" id="q" name="q" maxLength={200} defaultValue={query.q} /></div><div className="field"><label htmlFor="origin">ORIGIN</label><select id="origin" name="origin" defaultValue={query.origin ?? ""}><option value="">All origins</option><option value="fresh">Fresh</option><option value="stage2">Stage 2</option><option value="stage3">Stage 3</option></select></div><div className="field"><label htmlFor="status">STATUS</label><select id="status" name="status" defaultValue={query.status ?? ""}><option value="">All statuses</option>{[...new Set(workspace.cases.map(record => record.status))].sort().map(status => <option key={status}>{status}</option>)}</select></div>{role === "admin" && <div className="field"><label htmlFor="assignment">ASSIGNMENT</label><select id="assignment" name="assignment" defaultValue={query.assignment ?? ""}><option value="">All assignments</option><option value="unassigned">Unassigned</option><option value="assigned">Assigned</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agentLabel(agent)}</option>)}</select></div>}<button className="nb-button" type="submit">FILTER</button><Link href="/cases">CLEAR</Link></form>
    {filtered.length ? <div className="table-scroll"><table className="nb-table"><caption className="sr-only">Accessible cases</caption><thead><tr><th>CASE / CLIENT</th><th>STAGE / ORIGIN</th><th>STATUS</th><th>ASSIGNMENT</th><th>PAID</th><th>PENDING</th></tr></thead><tbody>{filtered.slice((page - 1) * 30, page * 30).map(record => <tr key={record.id}><td><Link href={`/cases/${record.id}`}>{record.case_prefix}-{record.case_number}</Link><span className="table-detail">{record.client?.client_code} · {record.client?.trading_as}</span></td><td>{record.stage}<span className="table-detail">{record.origin}</span></td><td><Badge>{record.status}</Badge></td><td>{record.assigned_agent_id ? role === "agent" ? "Assigned to you" : agents.find(agent => agent.id === record.assigned_agent_id) ? agentLabel(agents.find(agent => agent.id === record.assigned_agent_id)!) : "Assigned" : "Unassigned"}</td><td>{formatAmount(record.paid)}</td><td>{formatAmount(record.pending)}</td></tr>)}</tbody></table></div> : <p>No matching cases{role === "agent" ? " assigned to you" : ""}.</p>}
    <div className="actions"><p>{filtered.length} cases · Page {page} of {pages}</p>{page > 1 && <Link className="nb-button" href={pageLink(page - 1)}>PREVIOUS</Link>}{page < pages && <Link className="nb-button" href={pageLink(page + 1)}>NEXT</Link>}</div>
  </Card></main></>;
}
