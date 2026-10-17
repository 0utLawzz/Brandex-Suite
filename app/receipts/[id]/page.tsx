import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { uuidPattern } from "@/lib/ledger";
import { money } from "@/lib/operations";
import { Card } from "@/components/ui/card";
import PrintButton from "@/components/print-button";
type Snapshot = {
  client: { client_code: string; trading_as: string; address: string };
  case_reference: string;
  mark: string;
  tm: string | null;
  received_on: string;
  payer_name: string;
  reference: string;
  lines: { label: string; amount: string }[];
};
export default async function Receipt({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireStaff(),
    { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { data: r, error } = await supabase
    .from("suite_receipts")
    .select("*,suite_receivings!inner(client_id,voided,version)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load receipt");
  if (!r) notFound();
  const snapshot = r.snapshot as Snapshot,
    parent = r.suite_receivings as {
      client_id: string;
      voided: boolean;
      version: number;
    };
  const { data: revisions } = await supabase
    .from("suite_audit")
    .select("id,created_at,old_value,new_value")
    .eq("entity", "suite_receipts")
    .eq("row_ref", id)
    .order("id", { ascending: false })
    .limit(50);
  const valid = r.active && !parent.voided;
  return (
    <main className="phase-page receipt-page">
      <div className="actions no-print">
        <Link className="nb-button" href={`/accounts/${parent.client_id}`}>
          CLIENT LEDGER
        </Link>
        <PrintButton />
      </div>
      <Card>
        <p className="eyebrow">BRANDEX · CASE PAYMENT RECEIPT</p>
        <h1>{valid ? "Receipt" : "VOID RECEIPT"}</h1>
        <p>
          {r.receipt_number} · Payment revision {parent.version}
        </p>
        <h2>{snapshot.client.trading_as}</h2>
        <p>
          {snapshot.client.client_code} · {snapshot.client.address}
        </p>
        <p>
          Case {snapshot.case_reference} · {snapshot.mark} · TM{" "}
          {snapshot.tm ?? "Not issued"}
        </p>
        <p>
          Received on {snapshot.received_on} · Paid by{" "}
          {snapshot.payer_name || "Not recorded"}
        </p>
        <table className="nb-table">
          <thead>
            <tr>
              <th>CASE / STAGE</th>
              <th>RECEIVED · PKR</th>
            </tr>
          </thead>
          <tbody>
            {(snapshot.lines ?? []).map((l, i) => (
              <tr key={i}>
                <td>{l.label}</td>
                <td>{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>CASE RECEIPT TOTAL</th>
              <th>
                {money(
                  (snapshot.lines ?? []).reduce(
                    (n, l) => n + Number(l.amount),
                    0,
                  ),
                )}
              </th>
            </tr>
          </tfoot>
        </table>
        <p>{snapshot.reference}</p>
        <small>
          This receipt covers this case only. It is part of one parent receiving
          and is not additional money.
        </small>
        {!valid && (
          <p>
            Cancelled / removed allocation. Retained for history; not an active
            payment receipt.
          </p>
        )}
      </Card>
      <details className="no-print">
        <summary>Issued details and revision history</summary>
        {revisions?.map((a) => (
          <div className="nb-panel" key={a.id}>
            <strong>{a.created_at}</strong>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(
                { before: a.old_value, after: a.new_value },
                null,
                2,
              )}
            </pre>
          </div>
        ))}
      </details>
    </main>
  );
}
