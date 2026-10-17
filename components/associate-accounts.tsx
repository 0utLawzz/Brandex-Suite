"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { perform, money, todayPK } from "@/lib/operations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Associate = {
  id: string;
  name: string;
  contact: string;
  default_fee: string;
};
type Fee = {
  id: string;
  case_id: string;
  case_reference: string;
  stage_no: number;
  amount: string;
  paid: string;
  outstanding: string;
};
type Payment = {
  id: string;
  amount: string;
  paid_on: string;
  reference: string;
  version: number;
  voided: boolean;
  associate_allocations: {
    amount: string;
    associate_fees: {
      stage_no: number;
      cases: { case_number: string; clients: { client_code: string } };
    };
  }[];
};
export default function AssociateAccounts({ canWrite }: { canWrite: boolean }) {
  const [sb] = useState(() => createClient()),
    [contacts, setContacts] = useState<Associate[]>([]),
    [selected, setSelected] = useState(""),
    [fees, setFees] = useState<Fee[]>([]),
    [payments, setPayments] = useState<Payment[]>([]),
    [summary, setSummary] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [feePage, setFeePage] = useState(0),
    [paymentPage, setPaymentPage] = useState(0);
  const [id, setId] = useState(""),
    [version, setVersion] = useState(0),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(todayPK()),
    [reference, setReference] = useState("");
  async function loadContacts() {
    const r = await sb
      .from("service_associates")
      .select("id,name,contact,default_fee")
      .order("name")
      .limit(200);
    if (r.error) throw new Error("Could not load associates");
    setContacts(r.data ?? []);
  }
  async function load() {
    if (!selected) return;
    const [a, b, c] = await Promise.all([
      sb
        .from("associate_fee_position")
        .select("id,case_id,case_reference,stage_no,amount,paid,outstanding")
        .eq("associate_id", selected)
        .order("assigned_on")
        .order("id")
        .range(feePage * 50, feePage * 50 + 49),
      sb
        .from("associate_payments")
        .select(
          "id,amount,paid_on,reference,version,voided,associate_allocations(amount,associate_fees(stage_no,cases(case_number,clients(client_code))))",
        )
        .eq("associate_id", selected)
        .order("created_at", { ascending: false })
        .order("id")
        .range(paymentPage * 30, paymentPage * 30 + 29),
      sb.rpc("suite_associate_summary", { p_associate: selected }),
    ]);
    if ([a, b, c].some((x) => x.error))
      throw new Error("Could not load associate account");
    setFees(a.data ?? []);
    setPayments(b.data as unknown as Payment[]);
    setSummary(c.data);
  }
  useEffect(() => {
    loadContacts().catch((e) => setError(e.message));
  }, [sb]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [selected, feePage, paymentPage]);
  function clear() {
    setId("");
    setVersion(0);
    setAmount("");
    setReference("");
  }
  async function execute(action: string, data: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const result = await perform(action, data);
      await loadContacts();
      await load();
      setMessage(
        "Saved. Assignment fees remain separate from client stage fees.",
      );
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function newContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await execute(
      "associate",
      Object.fromEntries(new FormData(e.currentTarget)),
    );
    if (result) setSelected(result.id);
  }
  async function settle(e: React.FormEvent) {
    e.preventDefault();
    const paymentId = id || crypto.randomUUID();
    setId(paymentId);
    if (
      await execute("settlement", {
        id: paymentId,
        associate_id: selected,
        version,
        amount,
        date,
        reference,
      })
    )
      clear();
  }
  return (
    <>
      <Card>
        <h2>Service Associate contacts</h2>
        <p>
          Business contacts and payees; no app login. Default agreed fee is
          Rs.1,000, separate from client fees.
        </p>
        <div className="field">
          <label htmlFor="associate-account">Select contact</label>
          <select
            id="associate-account"
            className="nb-input"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setFeePage(0);
              setPaymentPage(0);
              clear();
            }}
          >
            <option value="">Choose Service Associate</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.contact}
              </option>
            ))}
          </select>
        </div>
        {canWrite && (
          <details>
            <summary>Add Service Associate</summary>
            <form onSubmit={newContact}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="associate-name">Name</label>
                  <Input id="associate-name" name="name" required />
                </div>
                <div className="field">
                  <label htmlFor="associate-contact">Contact</label>
                  <Input id="associate-contact" name="contact" />
                </div>
                <div className="field">
                  <label htmlFor="associate-default">Default agreed fee</label>
                  <Input
                    id="associate-default"
                    name="default_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="1000"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy}>
                ADD CONTACT
              </Button>
            </form>
          </details>
        )}
      </Card>
      {selected && (
        <>
          <div className="payment-summary">
            {[
              ["ASSIGNMENT FEES", summary.billed],
              ["PAID", summary.paid],
              ["UNPAID", summary.outstanding],
            ].map(([label, v]) => (
              <Card key={label}>
                <p className="eyebrow">{label}</p>
                <strong>{money(v)}</strong>
              </Card>
            ))}
          </div>
          <Card>
            <h2>Assignment fees</h2>
            <div className="table-scroll">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>CASE / STAGE</th>
                    <th>FEE</th>
                    <th>PAID</th>
                    <th>UNPAID</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <Link href={`/cases/${f.case_id}`}>
                          {f.case_reference}
                        </Link>{" "}
                        · Stage {f.stage_no}
                      </td>
                      <td>{money(f.amount)}</td>
                      <td>{money(f.paid)}</td>
                      <td>{money(f.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="actions">
              <Button
                disabled={!feePage}
                onClick={() => setFeePage(feePage - 1)}
              >
                PREVIOUS FEES
              </Button>
              <Button
                disabled={fees.length < 50}
                onClick={() => setFeePage(feePage + 1)}
              >
                NEXT FEES
              </Button>
            </div>
          </Card>
          {canWrite && (
            <Card className="module-card">
              <h2>
                {version ? "Edit payment" : "Record weekly / partial payment"}
              </h2>
              <p>
                Automatically settles oldest unpaid assignment fees.
                Stopped/dropped cases retain their payable.
              </p>
              <form onSubmit={settle}>
                <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="settlement-amount">Amount</label>
                      <Input
                        id="settlement-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="settlement-date">Paid on</label>
                      <Input
                        id="settlement-date"
                        type="date"
                        value={date}
                        max={todayPK()}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field full">
                      <label htmlFor="settlement-reference">
                        Reference / notes
                      </label>
                      <Input
                        id="settlement-reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="accent">
                    SAVE PAYMENT
                  </Button>
                  <Button onClick={clear}>NEW / CLEAR</Button>
                </fieldset>
              </form>
            </Card>
          )}
          <Card className="module-card">
            <h2>Payments & allocations</h2>
            {payments.map((p) => (
              <div className="nb-panel" key={p.id}>
                <strong>
                  {p.paid_on} · {money(p.amount)} ·{" "}
                  {p.voided ? "VOID" : `Revision ${p.version}`}
                </strong>
                <p>{p.reference}</p>
                <Link className="nb-button" href={`/audit?ref=${p.id}`}>
                  PAYMENT AUDIT
                </Link>
                <ul>
                  {p.associate_allocations.map((a, i) => (
                    <li key={i}>
                      {a.associate_fees.cases.clients.client_code}-
                      {a.associate_fees.cases.case_number} · Stage{" "}
                      {a.associate_fees.stage_no} · {money(a.amount)}
                    </li>
                  ))}
                </ul>
                {canWrite && !p.voided && (
                  <>
                    <Button
                      onClick={() => {
                        setId(p.id);
                        setVersion(p.version);
                        setAmount(String(p.amount));
                        setDate(p.paid_on);
                        setReference(p.reference);
                      }}
                    >
                      EDIT
                    </Button>
                    <Button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Void this associate payment? History remains.",
                          )
                        )
                          execute("void_settlement", {
                            id: p.id,
                            associate_id: selected,
                            version: p.version,
                          });
                      }}
                    >
                      VOID
                    </Button>
                  </>
                )}
              </div>
            ))}
            <div className="actions">
              <Button
                disabled={!paymentPage}
                onClick={() => setPaymentPage(paymentPage - 1)}
              >
                PREVIOUS PAYMENTS
              </Button>
              <Button
                disabled={payments.length < 30}
                onClick={() => setPaymentPage(paymentPage + 1)}
              >
                NEXT PAYMENTS
              </Button>
            </div>
          </Card>
        </>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice success">
          {message}
        </p>
      )}
    </>
  );
}
