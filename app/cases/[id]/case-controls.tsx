"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentLabel, type Agent } from "@/lib/workspace";

export default function CaseControls({ caseId, status, assessment, assignedAgentId, updatedAt, agents, role }: { caseId: string; status: string; assessment: string | null; assignedAgentId: string | null; updatedAt: string; agents: Agent[]; role: "admin" | "agent" }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [version, setVersion] = useState(updatedAt);
  async function save(event: React.FormEvent<HTMLFormElement>, action: "workflow" | "assignment") {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(""); setMessage("");
    const payload = action === "assignment" ? { assigned_agent_id: data.get("agent") || null } : { status: data.get("status"), assessment: data.get("assessment") };
    try {
      const response = await fetch(`/api/cases/${caseId}/${action}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, expected_updated_at: version }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not save changes.");
      setVersion(result.updated_at); setMessage(action === "assignment" ? "Case assignment saved." : "Status and assessment saved."); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save changes."); }
    finally { setBusy(false); }
  }
  return <><p className="section-label">CASE WORKSPACE</p><h2>{role === "admin" ? "Assignment & assessment" : "My assessment"}</h2>
    {role === "admin" && <form onSubmit={event => save(event, "assignment")} className="assignment-form"><fieldset disabled={busy}><div className="field"><label htmlFor="assigned-agent">ASSIGNED AGENT</label><div className="search-row"><select id="assigned-agent" className="nb-input" name="agent" defaultValue={assignedAgentId ?? ""}><option value="">Unassigned</option>{assignedAgentId && !agents.some(agent => agent.id === assignedAgentId) && <option value={assignedAgentId}>Previous assignee (no longer an Agent)</option>}{agents.map(agent => <option key={agent.id} value={agent.id}>{agentLabel(agent)}</option>)}</select><Button type="submit">SAVE ASSIGNMENT</Button></div><small className="muted">Only Agent accounts appear here. Unassigning or reassigning removes the previous Agent’s access.</small></div></fieldset></form>}
    <form onSubmit={event => save(event, "workflow")}><fieldset disabled={busy} className="form-grid"><div className="field full"><label htmlFor="case-status">STATUS</label><Input id="case-status" name="status" required maxLength={80} defaultValue={status} /></div><div className="field full"><label htmlFor="case-assessment">ASSESSMENT</label><textarea id="case-assessment" name="assessment" className="nb-input nb-textarea" maxLength={10000} defaultValue={assessment ?? ""} /></div><div className="actions full"><Button type="submit" variant="accent">{busy ? "SAVING…" : "SAVE STATUS & ASSESSMENT"}</Button></div></fieldset></form>
    {error && <p role="alert" className="notice error">{error} <Button variant="ghost" onClick={() => router.refresh()}>RELOAD CASE</Button></p>}{message && <p role="status" className="notice success">{message}</p>}
  </>;
}
