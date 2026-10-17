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
      <Navbar role={role} />
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
          <div className="table-scroll">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>CLIENT</th>
                  <th>TERMS</th>
                  <th>BILLED</th>
                  <th>ALLOCATED</th>
                  <th>OUTSTANDING</th>
                  <th>ADVANCE</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/accounts/${c.id}`}>
                        {c.client_code} · {c.trading_as}
                      </Link>
                    </td>
                    <td>
                      {c.payment_terms === "monthly"
                        ? "Monthly Billing"
                        : "Advance"}
                      {Number(c.unpriced) > 0 && (
                        <small className="table-detail">
                          {c.unpriced} rates needed
                        </small>
                      )}
                    </td>
                    <td>{money(c.billed)}</td>
                    <td>{money(c.allocated)}</td>
                    <td>{money(c.outstanding)}</td>
                    <td>{money(Number(c.received) - Number(c.allocated))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
