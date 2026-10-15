"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatAmount, amountInCents, type LedgerEntry } from "@/lib/ledger";

export default function LedgerPanel({ caseId, entries, canWrite }: { caseId: string; entries: LedgerEntry[]; canWrite: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await mutate(editing ? "PATCH" : "POST", { id: editing?.id, amount: data.get("amount"), type: data.get("type"), status: data.get("status"), date: data.get("date") }, () => {
      form.reset(); setEditing(null);
    });
  }

  async function mutate(method: string, body: object, onSuccess?: () => void) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/cases/${caseId}/ledger`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update ledger.");
      onSuccess?.();
      setMessage(method === "DELETE" ? "Entry deleted." : "Entry saved.");
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update ledger."); }
    finally { setBusy(false); }
  }

  return <>
    <p className="muted">Paid and pending entries are separate amounts. Marking a pending entry paid moves that amount into the paid total.</p>
    {entries.length ? <div className="table-scroll"><table className="nb-table"><caption className="sr-only">Ledger entries for this case</caption><thead><tr><th>DATE</th><th>TYPE</th><th>AMOUNT</th><th>STATUS</th>{canWrite && <th>ACTIONS</th>}</tr></thead><tbody>
      {entries.map(entry => <tr key={entry.id}><td>{entry.date ?? "—"}</td><td>{entry.type}</td><td>{formatAmount(amountInCents(entry.amount) ?? 0)}</td><td><Badge tone={entry.status === "paid" ? "teal" : "yellow"}>{entry.status}</Badge></td>{canWrite && <td><div className="row-actions"><Button disabled={busy} onClick={() => { setEditing(entry); setError(""); setMessage(""); }}>EDIT</Button><Button disabled={busy} variant="ghost" onClick={() => {
        if (window.confirm("Delete this ledger entry?")) void mutate("DELETE", { id: entry.id }, () => { if (editing?.id === entry.id) setEditing(null); });
      }}>DELETE</Button></div></td>}</tr>)}
    </tbody></table></div> : <p className="notice">No ledger entries yet.</p>}
    {!canWrite && <p className="muted">Read-only ledger access.</p>}
    {canWrite && <form key={editing?.id ?? "new"} onSubmit={save} className="ledger-form"><h3>{editing ? "Edit entry" : "Add ledger entry"}</h3><fieldset disabled={busy} className="form-grid">
      <div className="field"><label htmlFor="ledger-amount">AMOUNT</label><Input id="ledger-amount" name="amount" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={editing?.amount ?? ""} /></div>
      <div className="field"><label htmlFor="ledger-type">TYPE / DESCRIPTION</label><Input id="ledger-type" name="type" required maxLength={100} defaultValue={editing?.type ?? "payment"} /></div>
      <div className="field"><label htmlFor="ledger-status">PAYMENT STATUS</label><select id="ledger-status" name="status" className="nb-input" defaultValue={editing?.status ?? "pending"}><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
      <div className="field"><label htmlFor="ledger-date">DATE</label><Input id="ledger-date" name="date" type="date" required defaultValue={editing?.date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} /></div>
      <div className="actions full"><Button type="submit" variant="accent">{busy ? "SAVING…" : editing ? "SAVE CHANGES" : "ADD ENTRY"}</Button>{editing && <Button onClick={() => setEditing(null)}>CANCEL EDIT</Button>}</div>
    </fieldset></form>}
    {error && <p role="alert" className="notice error">{error}</p>}
    {message && <p role="status" className="notice success">{message}</p>}
  </>;
}
