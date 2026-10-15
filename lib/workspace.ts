import type { SupabaseClient } from "@supabase/supabase-js";
import { amountInCents } from "@/lib/ledger";

export type CaseSummary = { id: string; case_prefix: string; case_number: string; stage: string; status: string; origin: string; assigned_agent_id: string | null; updated_at: string; client: { client_code: string; trading_as: string } | null; paid: number; pending: number };
export type Agent = { id: string; full_name: string | null; email: string | null };
export function agentLabel(agent: Agent) { return agent.full_name ? `${agent.full_name}${agent.email ? ` (${agent.email})` : ""}` : agent.email ?? `Agent ${agent.id.slice(0, 8)}`; }

export async function loadAgents(supabase: SupabaseClient): Promise<Agent[]> {
  const agents: Agent[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("profiles").select("id, full_name, email").eq("role", "agent").order("id").range(offset, offset + 499);
    if (error) throw new Error("Could not load agents.");
    agents.push(...data); if (data.length < 500) break;
  }
  return agents;
}

export async function loadWorkspace(supabase: SupabaseClient) {
  const cases: CaseSummary[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("cases").select("id, case_prefix, case_number, stage, status, origin, assigned_agent_id, updated_at, clients(client_code, trading_as)").order("updated_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) throw new Error("Could not load workspace cases.");
    cases.push(...data.map(record => ({ ...record, client: (Array.isArray(record.clients) ? record.clients[0] : record.clients) ?? null, paid: 0, pending: 0 })));
    if (data.length < 500) break;
  }
  const byId = new Map(cases.map(record => [record.id, record]));
  let paid = 0, pending = 0;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("ledger").select("id, case_id, amount, status").order("id").range(offset, offset + 499);
    if (error) throw new Error("Could not load workspace payments.");
    for (const entry of data) {
      const record = byId.get(entry.case_id);
      if (!record) continue;
      const cents = amountInCents(entry.amount) ?? 0;
      if (entry.status === "paid") { record.paid += cents; paid += cents; }
      else { record.pending += cents; pending += cents; }
    }
    if (data.length < 500) break;
  }
  const { count: documents, error } = await supabase.from("documents").select("id", { count: "exact", head: true });
  if (error) throw new Error("Could not load document count.");
  return { cases, paid, pending, documents: documents ?? 0 };
}

export function filterCases(cases: CaseSummary[], query: { q?: string; origin?: string; assignment?: string; status?: string }) {
  const search = (query.q ?? "").trim().toLowerCase().slice(0, 200);
  return cases.filter(record => (!search || `${record.case_prefix}-${record.case_number} ${record.client?.client_code ?? ""} ${record.client?.trading_as ?? ""}`.toLowerCase().includes(search))
    && (!query.origin || record.origin === query.origin)
    && (!query.status || record.status === query.status)
    && (!query.assignment || (query.assignment === "unassigned" ? !record.assigned_agent_id : query.assignment === "assigned" ? Boolean(record.assigned_agent_id) : record.assigned_agent_id === query.assignment)));
}
