import DriveUploadPanel from "@/components/drive-upload-panel";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { formatAmount, ledgerTotals, uuidPattern, type LedgerEntry } from "@/lib/ledger";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CaseControls from "./case-controls";
import { loadAgents } from "@/lib/workspace";
import LedgerPanel from "./ledger-panel";
import MailMergePanel from "@/components/mail-merge-panel";
import { caseValues, type GeneratedDocument } from "@/lib/mail-merge";
import { loadTemplateLibrary } from "@/lib/template-data";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, role, user } = await requireStaff();
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { data: record, error } = await supabase.from("cases").select("id, client_id, case_prefix, case_number, origin, stage, status, assessment, assigned_agent_id, updated_at").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load case. Please try again.");
  if (!record) notFound();
  const { data: client, error: clientError } = await supabase.from("clients").select("client_code, trading_as, address").eq("id", record.client_id).single();
  if (clientError) throw new Error("Could not load client. Please try again.");

  // Fetch all pages so totals do not silently stop at the Data API row limit.
  const entries: LedgerEntry[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error: ledgerError } = await supabase.from("ledger").select("id, amount, type, status, date").eq("case_id", id).order("date", { ascending: false, nullsFirst: false }).order("id").range(offset, offset + 499);
    if (ledgerError) throw new Error("Could not load ledger. Please try again.");
    entries.push(...data as LedgerEntry[]);
    if (data.length < 500) break;
  }
  const totals = ledgerTotals(entries);
  const { templates, categories } = await loadTemplateLibrary(supabase);
  const documents: GeneratedDocument[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error: documentsError } = await supabase.from("documents").select("id, template_name, file_name, generated_at").eq("case_id", id).order("generated_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (documentsError) throw new Error("Could not load documents.");
    documents.push(...data); if (data.length < 500) break;
  }
  const agents = role === "admin" ? await loadAgents(supabase) : [];
  return <><Navbar current="cases" role={role} /><main className="phase-page"><div className="page-top"><div><p className="eyebrow">BRANDEX SUITE / CASE</p><h1>{record.case_prefix}-{record.case_number}</h1><Badge tone="teal">{record.status}</Badge></div><Link className="nb-button" href="/cases">ALL CASES</Link></div>
    <Card><h2>{client.trading_as}</h2><p>{client.client_code} · {client.address}</p><p>Origin: {record.origin} · Stage: {record.stage} · Status: {record.status}</p>{record.assessment && <p>Assessment: {record.assessment}</p>}<p className="muted">Core client and case details are captured at intake.</p></Card>
    {(role === "admin" || (role === "agent" && record.assigned_agent_id === user.id)) && <Card className="module-card"><CaseControls key={record.updated_at} caseId={id} status={record.status} assessment={record.assessment} assignedAgentId={record.assigned_agent_id} updatedAt={record.updated_at} agents={agents} role={role} /></Card>}
    <div className="payment-summary"><Card><p className="eyebrow">PAID</p><strong>{formatAmount(totals.paid)}</strong></Card><Card><p className="eyebrow">PENDING</p><strong>{formatAmount(totals.pending)}</strong></Card><Card><p className="eyebrow">PAYMENT STATUS</p><strong>{!entries.length ? "No entries" : totals.pending > 0 ? "Pending" : "Paid"}</strong></Card></div>
    <Card><p className="section-label">CASE PAYMENTS</p><h2>Ledger</h2><LedgerPanel caseId={id} entries={entries} canWrite={role === "admin"} /></Card>
    {(role === "admin" || role === "viewer") && <Card className="module-card"><DriveUploadPanel caseId={id} clientId={record.client_id} clientCode={client.client_code} caseNumber={record.case_number} canWrite={role === "admin"} /></Card>}
    <Card className="module-card"><MailMergePanel caseId={id} values={caseValues(record, client)} categories={categories} templates={templates} documents={documents} canGenerate={role === "admin"} /></Card>
  </main></>;
}
