"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Panel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

type Client = { id: string; client_code: string; trading_as: string; address: string };
const originItems = [
  { value: "fresh", label: "FRESH APPLICATION", description: "Brandex starts the filing workflow." },
  { value: "stage2", label: "STAGE 2 TAKEOVER", description: "Client is stuck after examination." },
  { value: "stage3", label: "STAGE 3 TAKEOVER", description: "Client is stuck after acknowledgment or notification." },
];

export default function IntakeForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [createClient, setCreateClient] = useState(false);
  const [origin, setOrigin] = useState("fresh");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (selected || createClient || query.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/intake/clients?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (response.ok) setResults((await response.json()).clients);
      } catch (requestError) { if ((requestError as Error).name !== "AbortError") setError("Client search failed."); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, selected, createClient]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!selected && !createClient) { setError("Select an existing client or choose Create new client."); setBusy(false); return; }
    if (selected) form.set("client_id", selected.id); form.set("origin", origin);
    try {
      const response = await fetch("/api/intake", { method: "POST", body: form }); const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not create the case.");
      setMessage(`Case ${body.caseNumber} created successfully.`); formElement.reset(); setSelected(null); setCreateClient(false); setQuery(""); setOrigin("fresh");
      // A fresh navigation also discards case lists prefetched before intake.
      window.location.assign(`/cases/${body.id}`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not create the case."); } finally { setBusy(false); }
  }

  return <main className="phase-page intake-page"><div className="page-top"><div><Badge tone="accent">ADMIN ONLY</Badge><p className="eyebrow">BRANDEX SUITE / PHASE 2</p><h1>NEW CASE INTAKE</h1><p className="muted">Capture client identity, origin, case number, and images together.</p></div><Link className="nb-button nb-button-dark" href="/">BACK</Link></div><Card className="intake-card"><form onSubmit={submit}><section><p className="section-label">01 / CLIENT</p><h2>Find or create the client</h2><div className="field"><label htmlFor="client-search">Search by client code or trading-as name</label><div className="search-row"><Input id="client-search" value={query} onChange={event => { setQuery(event.target.value); setSelected(null); setCreateClient(false); }} placeholder="E.G. BX-1049 OR NORTHSTAR FOODS" disabled={Boolean(selected || createClient)} /><Button variant="ghost" onClick={() => { setSelected(null); setCreateClient(false); setQuery(""); }} disabled={!selected && !createClient}>CLEAR</Button></div></div>{results.length > 0 && <div className="search-results" aria-live="polite">{results.map(client => <button type="button" key={client.id} className="result" onClick={() => { setSelected(client); setQuery(client.client_code); setResults([]); }}><strong>{client.client_code}</strong><span>{client.trading_as}</span><small>{client.address}</small></button>)}</div>}{query.trim().length >= 2 && !selected && !createClient && results.length === 0 && <button type="button" className="create-option" onClick={() => setCreateClient(true)}>+ CREATE NEW CLIENT “{query.trim()}”</button>}{selected && <Panel className="selected-client"><strong>{selected.client_code} · {selected.trading_as}</strong><span>{selected.address}</span></Panel>}{createClient && <Panel className="nested-form"><p className="muted">NEW CLIENT DETAILS</p><div className="form-grid"><div className="field"><label htmlFor="client_code">CLIENT CODE</label><Input id="client_code" name="client_code" defaultValue={query} required /></div><div className="field"><label htmlFor="trading_as">TRADING-AS NAME</label><Input id="trading_as" name="trading_as" required /></div><div className="field full"><label htmlFor="address">ADDRESS</label><textarea className="nb-input nb-textarea" id="address" name="address" required /></div></div></Panel>}</section><section><p className="section-label">02 / CASE</p><h2>Core case details</h2><div className="form-grid"><div className="field"><label htmlFor="case_prefix">CASE PREFIX</label><Input id="case_prefix" name="case_prefix" placeholder="TM" required /></div><div className="field"><label htmlFor="case_number">CASE NUMBER</label><Input id="case_number" name="case_number" placeholder="SIX DIGIT NUMBER" required /></div><div className="field full"><label>ORIGIN</label><Tabs items={originItems} value={origin} onChange={setOrigin} /></div><div className="field full"><label htmlFor="images">SUPPORTING IMAGES</label><Input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small className="muted">Images upload to the private case-images bucket under the new case ID.</small></div></div></section>{message && <p className="notice success">{message}</p>}{error && <p className="notice error">{error}</p>}<div className="actions"><Link className="nb-button nb-button-dark" href="/">CANCEL</Link><Button variant="accent" type="submit" disabled={busy}>{busy ? "CREATING…" : "CREATE CASE"}</Button></div></form></Card></main>;
}
