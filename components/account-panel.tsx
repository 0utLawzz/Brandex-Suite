"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";
import { money, perform, todayPK, type Charge } from "@/lib/operations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Client = {
  id: string;
  client_code: string;
  trading_as: string;
  payment_terms: string;
  stage_rates: Record<string, number>;
  city: string;
};
type Receiving = {
  id: string;
  amount: string;
  received_on: string;
  payer_name: string;
  reference: string;
  version: number;
  voided: boolean;
  suite_allocations: {
    charge_id: string;
    amount: string;
    suite_charges: {
      id: string;
      label: string;
      case_id: string;
      stage_no: number | null;
      cases: { case_number: string; application_name: string };
    };
  }[];
  suite_receipts: { id: string; receipt_number: string; active: boolean }[];
};
export default function AccountPanel({
  client: initial,
  canWrite,
}: {
  client: Client;
  canWrite: boolean;
}) {
  const [sb] = useState(() => createClient());
  const [client, setClient] = useState(initial),
    [rates, setRates] = useState<Record<string, string>>(
      Object.fromEntries(
        Object.entries(initial.stage_rates).map(([k, v]) => [k, String(v)]),
      ),
    ),
    [terms, setTerms] = useState(initial.payment_terms),
    [code, setCode] = useState(initial.client_code),
    [city, setCity] = useState(initial.city);
  const [summary, setSummary] = useState<Record<string, number | string>>({}),
    [charges, setCharges] = useState<Charge[]>([]),
    [receivings, setReceivings] = useState<Receiving[]>([]),
    [q, setQ] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [page, setPage] = useState(0);
  const loadSequence = useRef(0);
  const [id, setId] = useState(""),
    [version, setVersion] = useState(0),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(todayPK()),
    [payer, setPayer] = useState(""),
    [reference, setReference] = useState("");
  const [alloc, setAlloc] = useState<
    Record<string, { amount: string; label: string }>
  >({});
  async function load() {
    const generation = ++loadSequence.current;
    const [a, b, c, d] = await Promise.all([
      sb.rpc("suite_account_summary", { p_client: client.id }),
      sb.rpc("suite_charge_search", { p_client: client.id, p_q: q }),
      sb
        .from("suite_receivings")
        .select(
          "id,amount,received_on,payer_name,reference,version,voided,suite_allocations(charge_id,amount,suite_charges(id,label,case_id,stage_no,cases(case_number,application_name))),suite_receipts(id,receipt_number,active)",
        )
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 30, page * 30 + 29),
      sb
        .from("clients")
        .select("id,client_code,trading_as,payment_terms,stage_rates,city")
        .eq("id", client.id)
        .single(),
    ]);
    if (generation !== loadSequence.current) return;
    if ([a, b, c, d].some((x) => x.error))
      throw new Error("Could not load client account.");
    setSummary(a.data);
    setCharges(b.data);
    setReceivings(c.data as unknown as Receiving[]);
    if (!d.data) throw new Error("Client not found");
    setClient(d.data);
  }
  useEffect(() => {
    let live = true;
    const timer = setTimeout(
      () =>
        load().catch((e) => {
          if (live) setError(e.message);
        }),
      200,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, page, sb]);
  async function execute(action: string, data: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await perform(action, data);
      await load();
      setMessage("Saved. Financial corrections do not move case workflow.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setId("");
    setVersion(0);
    setAmount("");
    setReference("");
    setPayer("");
    setAlloc({});
  }
  function edit(r: Receiving) {
    setId(r.id);
    setVersion(r.version);
    setAmount(String(r.amount));
    setDate(r.received_on);
    setPayer(r.payer_name);
    setReference(r.reference);
    setAlloc(
      Object.fromEntries(
        r.suite_allocations.map((a) => [
          a.charge_id,
          {
            amount: String(a.amount),
            label: `${client.client_code}-${a.suite_charges.cases.case_number} · ${a.suite_charges.label}`,
          },
        ]),
      ),
    );
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const receivingId = id || crypto.randomUUID();
    if (!id) setId(receivingId);
    if (
      await execute("receiving", {
        id: receivingId,
        client_id: client.id,
        version,
        amount,
        date,
        payer_name: payer,
        reference,
        allocations: Object.entries(alloc)
          .filter(([, v]) => Number(v.amount) > 0)
          .map(([charge_id, v]) => ({ charge_id, amount: v.amount })),
      })
    )
      reset();
  }
  async function saveRates(e: React.FormEvent) {
    e.preventDefault();
    await execute("client", {
      id: client.id,
      client_code: code.trim().toUpperCase(),
      payment_terms: terms,
      city,
      stage_rates: Object.fromEntries(
        Object.entries(rates)
          .filter(([, v]) => v !== "")
          .map(([k, v]) => [k, Number(v)]),
      ),
    });
  }
  return (
    <>
      <div className="payment-summary">
        {[
          ["BILLED", summary.billed],
          ["ALLOCATED", summary.allocated],
          ["OUTSTANDING", summary.outstanding],
          [
            "UNALLOCATED ADVANCE",
            Number(summary.received ?? 0) - Number(summary.allocated ?? 0),
          ],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="eyebrow">{label}</p>
            <strong>{money(value)}</strong>
          </Card>
        ))}
      </div>
      {Number(summary.unpriced) > 0 && (
        <p className="notice error">
          {summary.unpriced} stage charge(s) need a confirmed rate. They are not
          treated as Paid.
        </p>
      )}
      {Number(summary.legacy_entries) > 0 && (
        <p className="notice">
          {summary.legacy_entries} legacy paid/pending entries remain read-only
          on their case pages. They are not automatically counted as charges or
          allocated receiving.
        </p>
      )}
      <Card>
        <h2>Client terms & stage rates</h2>
        <p>
          Rate changes apply to new charges. Existing charges retain their
          amount.
        </p>
        <form onSubmit={saveRates}>
          <fieldset
            disabled={!canWrite || busy}
            style={{ border: 0, padding: 0 }}
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="account-code">Client code</label>
                <Input
                  id="account-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="account-terms">Payment terms</label>
                <select
                  id="account-terms"
                  className="nb-input"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                >
                  <option value="monthly">Monthly Billing / Credit</option>
                  <option value="advance">Advance Payment</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="account-city">City</label>
                <Input
                  id="account-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              {[1, 2, 3, 4].map((s) => (
                <div className="field" key={s}>
                  <label htmlFor={`account-rate-${s}`}>Stage {s} rate</label>
                  <Input
                    id={`account-rate-${s}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={rates[s] ?? ""}
                    onChange={(e) =>
                      setRates({ ...rates, [s]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            {canWrite && (
              <Button type="submit" disabled={busy}>
                SAVE CLIENT SETTINGS
              </Button>
            )}
          </fieldset>
        </form>
      </Card>
      <Card className="module-card">
        <h2>Charges & allocations</h2>
        <div className="field">
          <label htmlFor="charge-search">
            Find case reference, TM, mark or stage
          </label>
          <Input
            id="charge-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <small>
            Up to 50 matching charges. Search to narrow large accounts; selected
            allocations remain below.
          </small>
        </div>
        <div className="table-scroll">
          <table className="nb-table">
            <thead>
              <tr>
                <th>CASE / MARK</th>
                <th>CHARGE</th>
                <th>AMOUNT</th>
                <th>ALLOCATED</th>
                <th>DUE</th>
                {canWrite && <th>RECEIVING LINE</th>}
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/cases/${c.case_id}`}>{c.case_reference}</Link>
                    <span className="table-detail">{c.application_name}</span>
                  </td>
                  <td>{c.label}</td>
                  <td>{money(c.amount)}</td>
                  <td>{money(c.received)}</td>
                  <td>{money(c.outstanding)}</td>
                  {canWrite && (
                    <td>
                      <Button
                        disabled={c.amount == null || busy}
                        onClick={() =>
                          setAlloc((prev) => ({
                            ...prev,
                            [c.id]: prev[c.id] ?? {
                              amount: "",
                              label: `${c.case_reference} · ${c.label}`,
                            },
                          }))
                        }
                      >
                        ADD LINE
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {canWrite && (
        <Card className="module-card">
          <h2>{version ? "Edit receiving" : "Record client receiving"}</h2>
          <form onSubmit={save}>
            <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="receiving-amount">Total received</label>
                  <Input
                    id="receiving-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="receiving-date">Received on</label>
                  <Input
                    id="receiving-date"
                    type="date"
                    max={todayPK()}
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="receiving-payer">
                    Paid by / verification name
                  </label>
                  <Input
                    id="receiving-payer"
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="receiving-reference">
                    Payment reference / notes
                  </label>
                  <Input
                    id="receiving-reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
              <p>
                Allocate manually to case/stage charges. Any unallocated
                remainder stays as client advance.
              </p>
              {Object.entries(alloc).map(([key, line]) => (
                <div className="search-row" key={key}>
                  <label htmlFor={`allocate-${key}`}>{line.label}</label>
                  <Input
                    id={`allocate-${key}`}
                    aria-label={`Allocation ${line.label}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={line.amount}
                    onChange={(e) =>
                      setAlloc({
                        ...alloc,
                        [key]: { ...line, amount: e.target.value },
                      })
                    }
                    required
                  />
                  <Button
                    onClick={() =>
                      setAlloc((prev) => {
                        const n = { ...prev };
                        delete n[key];
                        return n;
                      })
                    }
                  >
                    REMOVE
                  </Button>
                </div>
              ))}
              <p>
                Allocated{" "}
                {money(
                  Object.values(alloc).reduce(
                    (sum, x) => sum + Number(x.amount || 0),
                    0,
                  ),
                )}{" "}
                · unallocated{" "}
                {money(
                  Number(amount || 0) -
                    Object.values(alloc).reduce(
                      (sum, x) => sum + Number(x.amount || 0),
                      0,
                    ),
                )}
              </p>
              <Button type="submit" variant="teal">
                SAVE RECEIVING
              </Button>
              <Button onClick={reset}>CLEAR / NEW RECEIVING</Button>
            </fieldset>
          </form>
        </Card>
      )}
      <Card className="module-card">
        <h2>Receiving & case receipts</h2>
        {receivings.map((r) => (
          <div className="nb-panel" key={r.id}>
            <strong>
              {money(r.amount)} · {r.received_on} ·{" "}
              {r.voided ? "VOID" : `Revision ${r.version}`}
            </strong>
            <p>
              {r.payer_name} · {r.reference}
            </p>
            <div className="actions">
              <Link className="nb-button" href={`/audit?ref=${r.id}`}>
                AUDIT HISTORY
              </Link>
              {r.suite_receipts.map((receipt) => (
                <Link
                  className="nb-button"
                  key={receipt.id}
                  href={`/receipts/${receipt.id}`}
                >
                  {receipt.active && !r.voided
                    ? "CASE RECEIPT"
                    : "VOID RECEIPT"}{" "}
                  · {receipt.receipt_number.slice(0, 15)}
                </Link>
              ))}
              {canWrite && !r.voided && (
                <>
                  <Button onClick={() => edit(r)}>EDIT</Button>
                  <Button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Void this receiving? History remains and case workflow will not move.",
                        )
                      )
                        execute("void_receiving", {
                          id: r.id,
                          client_id: client.id,
                          version: r.version,
                        });
                    }}
                  >
                    VOID
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {!receivings.length && <p>No receiving on this page.</p>}
        <div className="actions">
          <Button disabled={!page || busy} onClick={() => setPage(page - 1)}>
            PREVIOUS
          </Button>
          <span>Page {page + 1}</span>
          <Button
            disabled={receivings.length < 30 || busy}
            onClick={() => setPage(page + 1)}
          >
            NEXT
          </Button>
        </div>
      </Card>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
    </>
  );
}
