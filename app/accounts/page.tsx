import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { money } from "@/lib/operations";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
export default async function Accounts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { role, supabase } = await requireStaff(),
    q = await searchParams,
    page = Math.max(1, Math.min(Number(q.page) || 1, 100000));
  const { data, error } = await supabase.rpc("suite_client_list", {
    p_q: q.q ?? "",
    p_page: page,
  });
  if (error) throw new Error("Could not load client accounts");
  const rows = data.rows as {
    id: string;
    client_code: string;
    trading_as: string;
    payment_terms: string;
    billed: string;
    allocated: string;
    outstanding: string;
    unpriced: number;
    received: string;
  }[];
  return (
    <>
      <Navbar role={role} current="accounts" />
      <main className="phase-page">
        <div className="page-top">
          <div>
            <p className="eyebrow">CLIENT LEDGER</p>
            <h1>Client accounts</h1>
            <p>Charges, receiving, allocations and advances · PKR</p>
          </div>
          {role === "admin" && (
            <Link className="nb-button" href="/new-case">
              NEW CASE
            </Link>
          )}
        </div>
        <Card>
          <form className="search-row">
            <input
              className="nb-input"
              name="q"
              aria-label="Find client"
              defaultValue={q.q}
              placeholder="Client code, name or city"
            />
            <button className="nb-button">SEARCH</button>
          </form>
          <div className="account-directory">
            {rows.map(c=><article className="account-card" key={c.id}>
              <div className="account-card-top"><span className="account-code">{c.client_code}</span><span className="nb-badge">{c.payment_terms==="monthly"?"Monthly Billing":"Advance"}</span></div>
              <h2>{c.trading_as}</h2>
              <p className="muted">{Number(c.unpriced)>0?`${c.unpriced} stage rate(s) need confirmation`:"All issued stage charges priced"}</p>
              <dl className="account-figures"><div><dt>Billed</dt><dd>{money(c.billed)}</dd></div><div><dt>Allocated</dt><dd>{money(c.allocated)}</dd></div><div><dt>Unallocated advance</dt><dd>{money(Number(c.received)-Number(c.allocated))}</dd></div></dl>
              <div className={`account-balance ${Number(c.unpriced)>0?"needs-rate":Number(c.outstanding)>0?"has-due":"is-clear"}`}><span>{Number(c.unpriced)>0?"Known outstanding · PKR":"Outstanding · PKR"}</span><strong>{money(c.outstanding)}</strong></div>
              <Link className="nb-button nb-button-teal" href={`/accounts/${c.id}`}>OPEN CLIENT LEDGER ↗</Link>
            </article>)}
          </div>
          <div className="actions">
            <p>
              {data.total} accounts · page {page}
            </p>
            {page > 1 && (
              <Link
                className="nb-button"
                href={`/accounts?q=${encodeURIComponent(q.q ?? "")}&page=${page - 1}`}
              >
                PREVIOUS
              </Link>
            )}
            {page * 30 < data.total && (
              <Link
                className="nb-button"
                href={`/accounts?q=${encodeURIComponent(q.q ?? "")}&page=${page + 1}`}
              >
                NEXT
              </Link>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
