import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { money, stepLabels } from "@/lib/operations";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
type Row = {
  id: string;
  client_id: string;
  case_reference: string;
  application_name: string;
  tm_number: string | null;
  nice_class: number | null;
  workflow_stage: number;
  workflow_step: string;
  payment_terms: string;
  billed: string;
  received: string;
  outstanding: string;
  unpriced: number;
  followup: { tone: string; reason: string; due?: string } | null;
  trading_as: string;
};
export default async function Cases({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, role } = await requireStaff(),
    query = await searchParams,
    page = Math.max(1, Math.min(Number(query.page) || 1, 100000));
  const [a, b, c] = await Promise.all([
    supabase.rpc("suite_case_list", { p_filter: query, p_page: page }),
    supabase.from("case_series").select("code").order("code"),
    supabase
      .from("service_associates")
      .select("id,name")
      .order("name")
      .limit(200),
  ]);
  if (a.error)
    throw new Error(
      "Could not load case register. Check date filters and retry.",
    );
  const rows = a.data.rows as Row[];
  const pageLink = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) q.set(k, v);
    q.set("page", String(p));
    return `/cases?${q}`;
  };
  return (
    <>
      <Navbar current="cases" role={role} />
      <main className="phase-page">
        <div className="page-top">
          <div>
            <p className="eyebrow">CASE REGISTER</p>
            <h1>Cases & next actions</h1>
            <p>One record from registration to certificate delivery.</p>
          </div>
          {role === "admin" && (
            <Link className="nb-button nb-button-accent" href="/new-case">
              NEW CASE
            </Link>
          )}
        </div>
        <Card>
          <form className="case-filters">
            <div className="field">
              <label htmlFor="q">TM / case / mark / client</label>
              <input
                id="q"
                name="q"
                className="nb-input"
                defaultValue={query.q}
              />
            </div>
            <div className="field">
              <label htmlFor="series">Series</label>
              <select
                id="series"
                name="series"
                className="nb-input"
                defaultValue={query.series ?? ""}
              >
                <option value="">All series</option>
                {b.data?.map((s) => (
                  <option key={s.code}>{s.code}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="stage">Stage</label>
              <select
                id="stage"
                name="stage"
                className="nb-input"
                defaultValue={query.stage ?? ""}
              >
                <option value="">All stages</option>
                {[1, 2, 3, 4].map((s) => (
                  <option key={s} value={s}>
                    Stage {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="step">Current event</label>
              <select
                id="step"
                name="step"
                className="nb-input"
                defaultValue={query.step ?? ""}
              >
                <option value="">All events</option>
                {Object.entries(stepLabels)
                  .filter(
                    ([k]) =>
                      !["reactivated", "restoration_approved"].includes(k),
                  )
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="flag">Focus</label>
              <select
                id="flag"
                name="flag"
                className="nb-input"
                defaultValue={query.flag ?? ""}
              >
                <option value="">All flags</option>
                <option value="red">Overdue / Red</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="review">Needs review</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="terms">Terms</label>
              <select
                id="terms"
                name="terms"
                className="nb-input"
                defaultValue={query.terms ?? ""}
              >
                <option value="">All terms</option>
                <option value="monthly">Monthly Billing</option>
                <option value="advance">Advance Payment</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="balance">Payment position</label>
              <select
                id="balance"
                name="balance"
                className="nb-input"
                defaultValue={query.balance ?? ""}
              >
                <option value="">All balances</option>
                <option value="due">Outstanding</option>
                <option value="unpriced">Rate needed</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="class">Class</label>
              <input
                id="class"
                name="class"
                className="nb-input"
                type="number"
                min="1"
                max="45"
                defaultValue={query.class}
              />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                className="nb-input"
                defaultValue={query.city}
              />
            </div>
            <div className="field">
              <label htmlFor="associate">Service Associate</label>
              <select
                id="associate"
                name="associate"
                className="nb-input"
                defaultValue={query.associate ?? ""}
              >
                <option value="">All contacts</option>
                {c.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="from">Filed from</label>
              <input
                id="from"
                name="from"
                className="nb-input"
                type="date"
                defaultValue={query.from}
              />
            </div>
            <div className="field">
              <label htmlFor="to">Filed to</label>
              <input
                id="to"
                name="to"
                className="nb-input"
                type="date"
                defaultValue={query.to}
              />
            </div>
            <button className="nb-button">FILTER</button>
            <Link href="/cases">CLEAR</Link>
          </form>
          <div className="table-scroll">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>CASE / MARK</th>
                  <th>TM / CLASS</th>
                  <th>STAGE / EVENT</th>
                  <th>FOCUS / NEXT ACTION</th>
                  <th>TERMS</th>
                  <th>BILLED</th>
                  <th>ALLOCATED</th>
                  <th>DUE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/cases/${r.id}`}>{r.case_reference}</Link>
                      <strong className="table-detail">
                        {r.application_name || "Confirm mark name"}
                      </strong>
                      <span className="table-detail">{r.trading_as}</span>
                    </td>
                    <td>
                      {r.tm_number ?? "Not issued"}
                      <span className="table-detail">
                        Class {r.nice_class ?? "—"}
                      </span>
                    </td>
                    <td>
                      Stage {r.workflow_stage}
                      <span className="table-detail">
                        {stepLabels[r.workflow_step] ?? r.workflow_step}
                      </span>
                    </td>
                    <td>
                      {r.followup ? (
                        <span className={`workflow-flag ${r.followup.tone}`}>
                          {r.followup.reason}
                          {r.followup.due && (
                            <small className="table-detail">
                              Due {r.followup.due}
                            </small>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Link href={`/accounts/${r.client_id}`}>
                        {r.payment_terms === "monthly"
                          ? "Monthly Billing"
                          : "Advance"}
                      </Link>
                      {Number(r.unpriced) > 0 && (
                        <small className="table-detail">Rate needed</small>
                      )}
                    </td>
                    <td>{money(r.billed)}</td>
                    <td>{money(r.received)}</td>
                    <td>{money(r.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p>No matching cases.</p>}
          <div className="actions">
            <p>
              {a.data.total} cases · page {page}
            </p>
            {page > 1 && (
              <Link className="nb-button" href={pageLink(page - 1)}>
                PREVIOUS
              </Link>
            )}
            {page * 30 < a.data.total && (
              <Link className="nb-button" href={pageLink(page + 1)}>
                NEXT
              </Link>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
