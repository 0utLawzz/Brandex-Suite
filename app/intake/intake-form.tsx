"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { perform } from "@/lib/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
type Client = {
  id: string;
  client_code: string;
  trading_as: string;
  address: string;
};
export default function IntakeForm() {
  const [sb] = useState(() => createClient());
  const [series, setSeries] = useState<{ code: string; label: string }[]>([]),
    [code, setCode] = useState("X"),
    [number, setNumber] = useState("");
  const [q, setQ] = useState(""),
    [results, setResults] = useState<Client[]>([]),
    [selected, setSelected] = useState<Client | null>(null),
    [newClient, setNewClient] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function loadSeries() {
    const r = await sb.from("case_series").select("code,label").order("code");
    if (r.error) throw new Error("Could not load series");
    setSeries(r.data ?? []);
  }
  useEffect(() => {
    loadSeries().catch((e) => setError(e.message));
  }, [sb]);
  useEffect(() => {
    if (selected || newClient || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/intake/clients?q=${encodeURIComponent(q.trim())}`,
          { signal: controller.signal },
        );
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setResults(j.clients);
      } catch (e) {
        if ((e as Error).name !== "AbortError")
          setError("Client search failed. Please retry.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, selected, newClient]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!selected && !newClient)
        throw new Error("Select a client or create one.");
      const f = new FormData(e.currentTarget);
      if (selected) f.set("client_id", selected.id);
      else {
        if (!/^\d{1,6}$/.test(number))
          throw new Error("Enter a numeric client code.");
        f.set("client_code", `${code}-${number.padStart(3, "0")}`);
      }
      f.set("case_prefix", selected?.client_code.split("-")[0] ?? code);
      const r = await fetch("/api/intake", { method: "POST", body: f });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Registration failed");
      if (j.warning) sessionStorage.setItem(`case-warning-${j.id}`, j.warning);
      window.location.assign(`/cases/${j.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }
  async function addSeries(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const result = await perform("series", {
        code: f.get("code"),
        label: f.get("label"),
      });
      await loadSeries();
      setCode(result.code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="phase-page">
      <div className="page-top">
        <div>
          <p className="eyebrow">BRANDEX SUITE / NEW CASE</p>
          <h1>Case Registration</h1>
          <p>
            Client reference and case number identify the record. The trademark
            number is separate and can be added later.
          </p>
        </div>
        <Link className="nb-button" href="/cases">
          ALL CASES
        </Link>
      </div>
      <Card>
        <form onSubmit={submit}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
            <h2>Client</h2>
            <div className="field">
              <label htmlFor="client-search">Find existing client</label>
              <Input
                id="client-search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSelected(null);
                  setNewClient(false);
                }}
                placeholder="Client code or name"
              />
            </div>
            {results.map((c) => (
              <button
                className="nb-button"
                type="button"
                key={c.id}
                onClick={() => {
                  setSelected(c);
                  setResults([]);
                  setQ(c.client_code);
                }}
              >
                {c.client_code} · {c.trading_as}
              </button>
            ))}
            {selected && (
              <p>
                {selected.client_code} · {selected.trading_as} ·{" "}
                {selected.address}
              </p>
            )}
            {!selected && (
              <Button
                onClick={() => {
                  setNewClient(!newClient);
                  setResults([]);
                }}
              >
                CREATE NEW CLIENT
              </Button>
            )}
            {newClient && (
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="series">Series</label>
                  <select
                    id="series"
                    className="nb-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  >
                    {series.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} · {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="client-number">Client number</label>
                  <Input
                    id="client-number"
                    inputMode="numeric"
                    maxLength={6}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="254"
                    required
                  />
                  <small>
                    {code}-{number.padStart(3, "0")}
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="trading-as">Client / trading-as name</label>
                  <Input id="trading-as" name="trading_as" required />
                </div>
                <div className="field">
                  <label htmlFor="city">City</label>
                  <Input id="city" name="city" />
                </div>
                <div className="field full">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    className="nb-input"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="terms">Payment terms</label>
                  <select
                    className="nb-input"
                    id="terms"
                    name="payment_terms"
                    defaultValue="monthly"
                  >
                    <option value="monthly">Monthly Billing / Credit</option>
                    <option value="advance">Advance Payment</option>
                  </select>
                </div>
                {[1, 2, 3, 4].map((s) => (
                  <div className="field" key={s}>
                    <label htmlFor={`rate-${s}`}>
                      Stage {s} rate (optional)
                    </label>
                    <Input
                      id={`rate-${s}`}
                      name={`rate_${s}`}
                      type="number"
                      min="0"
                      step="0.01"
                    />
                    <small>Blank means rate needs confirmation.</small>
                  </div>
                ))}
              </div>
            )}
            <h2 style={{ marginTop: 28 }}>Case details</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="case-number">Case number (manual)</label>
                <Input
                  id="case-number"
                  name="case_number"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="002"
                  required
                />
                <small>For example X-254-002. This is not the TM number.</small>
              </div>
              <div className="field">
                <label htmlFor="mark">Mark / application name</label>
                <Input
                  id="mark"
                  name="application_name"
                  maxLength={200}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="tm">Trademark number (when issued)</label>
                <Input
                  id="tm"
                  name="tm_number"
                  inputMode="numeric"
                  placeholder="Six digits, e.g. 906828"
                  maxLength={12}
                />
                <small>
                  Leave blank before issue. Leading zeroes are preserved.
                </small>
              </div>
              <div className="field">
                <label htmlFor="class">Class</label>
                <Input
                  id="class"
                  name="nice_class"
                  type="number"
                  min="1"
                  max="45"
                />
              </div>
              <div className="field">
                <label htmlFor="origin">Starting point</label>
                <select
                  id="origin"
                  className="nb-input"
                  name="origin"
                  defaultValue="fresh"
                >
                  <option value="fresh">New application</option>
                  <option value="stage2">Existing Stage 2 case</option>
                  <option value="stage3">Existing Stage 3 case</option>
                </select>
                <small>
                  Existing cases require review of their actual event/date.
                </small>
              </div>
              <div className="field">
                <label htmlFor="images">Supporting trademark images</label>
                <Input
                  id="images"
                  name="images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                />
              </div>
            </div>
            <p>
              A stage charge is created once at the client's preset rate. Record
              the actual filing/event date on the case workspace.
            </p>
            <Button type="submit" variant="accent" disabled={busy}>
              {busy ? "REGISTERING…" : "REGISTER CASE"}
            </Button>
          </fieldset>
        </form>
      </Card>
      <details>
        <summary>Add a client series</summary>
        <Card>
          <form onSubmit={addSeries}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="new-series">Code</label>
                <Input id="new-series" name="code" maxLength={12} required />
              </div>
              <div className="field">
                <label htmlFor="series-label">Label</label>
                <Input id="series-label" name="label" />
              </div>
            </div>
            <Button type="submit" disabled={busy}>
              ADD SERIES
            </Button>
          </form>
        </Card>
      </details>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </main>
  );
}
