import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { loadWorkspace, loadAgents, agentLabel } from "@/lib/workspace";
import { formatAmount } from "@/lib/ledger";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const { supabase, role } = await requireStaff();
  const [workspace, agents] = await Promise.all([loadWorkspace(supabase), role === "admin" ? loadAgents(supabase) : Promise.resolve([])]);
  const statuses = new Map<string, number>();
  workspace.cases.forEach(record => statuses.set(record.status, (statuses.get(record.status) ?? 0) + 1));
  return <><Navbar current="dashboard" role={role} /><main className="phase-page"><div className="page-top"><div><p className="eyebrow">BRANDEX SUITE / {role}</p><h1>{role === "admin" ? "Operations overview" : role === "agent" ? "My workspace" : "Case overview"}</h1><p className="muted">{role === "agent" ? "Your assigned cases, payments, and next assessments." : role === "viewer" ? "Read-only overview of cases and payments." : "Manage assignments and keep track of cases and payments."}</p></div><div className="actions"><Link className="nb-button" href="/cases">{role === "agent" ? "MY CASES" : "ALL CASES"}</Link>{role === "admin" && <Link className="nb-button nb-button-accent" href="/intake">NEW CASE</Link>}</div></div>
    <div className="dashboard-stats">{[["CASES", workspace.cases.length], ["PAID", formatAmount(workspace.paid)], ["PENDING", formatAmount(workspace.pending)], ["DOCUMENTS", workspace.documents]].map(([label, value]) => <Card key={label}><p className="eyebrow">{label}</p><strong>{value}</strong></Card>)}</div>
    {role === "admin" && <Card className="module-card"><h2>Case assignments</h2><Link className="nb-button" href="/cases?assignment=unassigned">UNASSIGNED: {workspace.cases.filter(record => !record.assigned_agent_id).length}</Link><div className="agent-workload">{agents.map(agent => <Link key={agent.id} href={`/cases?assignment=${agent.id}`}><span>{agentLabel(agent)}</span><strong>{workspace.cases.filter(record => record.assigned_agent_id === agent.id).length} cases</strong></Link>)}{!agents.length && <p>No Agent accounts available.</p>}</div></Card>}
    <div className="dashboard-columns module-card"><Card><h2>Case status</h2><ul className="status-list">{[...statuses].map(([status, count]) => <li key={status}><Link href={`/cases?status=${encodeURIComponent(status)}`}>{status}</Link><strong>{count}</strong></li>)}</ul>{!statuses.size && <p>No cases yet.</p>}</Card><Card><h2>Recently updated</h2><ul className="status-list">{workspace.cases.slice(0, 6).map(record => <li key={record.id}><div><Link href={`/cases/${record.id}`}>{record.case_prefix}-{record.case_number}</Link><span className="table-detail">{record.client?.trading_as}</span></div><span>{record.status}</span></li>)}</ul>{!workspace.cases.length && <p>{role === "agent" ? "No cases assigned yet. Your Admin can assign cases to you." : role === "admin" ? "Create your first case to get started." : "No cases available."}</p>}</Card></div>
  </main></>;
}
