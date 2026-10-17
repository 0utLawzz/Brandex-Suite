import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { money } from "@/lib/operations";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
export default async function Dashboard() {
  const { supabase, role } = await requireStaff();
  const { data: d, error } = await supabase.rpc("suite_dashboard");
  if (error) throw new Error("Could not load operations overview");
  return (
    <>
      <Navbar current="dashboard" role={role} />
      <main className="phase-page">
        <div className="page-top">
          <div>
            <p className="eyebrow">BRANDEX OPERATIONS</p>
            <h1>Cases, payments & next actions</h1>
            <p>
              Workflow moves when staff records an event. Time flags keep
              delayed cases visible.
            </p>
          </div>
          {role === "admin" && (
            <Link className="nb-button nb-button-accent" href="/new-case">
              NEW CASE
            </Link>
          )}
        </div>
        <div className="dashboard-stats">
          {[
            ["CASES", d.cases],
            ["CLIENTS", d.clients],
            ["OVERDUE", d.overdue],
            ["REVIEW", d.review],
          ].map(([label, v]) => (
            <Card key={label}>
              <p className="eyebrow">{label}</p>
              <strong>{v}</strong>
            </Card>
          ))}
        </div>
        <div className="payment-summary">
          {[
            ["BILLED · PKR", money(d.billed)],
            ["ALLOCATED", money(d.allocated)],
            ["OUTSTANDING", money(d.outstanding)],
            ["CLIENT ADVANCE", money(Number(d.received) - Number(d.allocated))],
          ].map(([label, v]) => (
            <Card key={label}>
              <p className="eyebrow">{label}</p>
              <strong>{v}</strong>
            </Card>
          ))}
        </div>
        <Card>
          <h2>Focus on the next work</h2>
          <div className="actions">
            <Link className="nb-button" href="/cases?flag=red">
              OVERDUE: {d.overdue}
            </Link>
            <Link className="nb-button" href="/cases?flag=review">
              REVIEW: {d.review}
            </Link>
            <Link className="nb-button" href="/cases?balance=unpriced">
              RATES NEEDED: {d.unpriced}
            </Link>
            <Link className="nb-button" href="/accounts">
              CLIENT LEDGER
            </Link>
            <Link className="nb-button" href="/associates">
              ASSOCIATE UNPAID: {money(d.associate_due)}
            </Link>
          </div>
          <p>
            Monthly Billing permits progress with debt visible. Advance terms
            require the relevant stage charge to be fully allocated. No 60%
            rule.
          </p>
          {d.legacy_entries > 0 && (
            <p>
              {d.legacy_entries} historical paid/pending entries are preserved
              on their cases, separate from the new allocation ledger.
            </p>
          )}
        </Card>
      </main>
    </>
  );
}
