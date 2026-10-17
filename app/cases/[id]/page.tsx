import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { uuidPattern } from "@/lib/ledger";
import { money, stepLabels } from "@/lib/operations";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import CaseOperations from "@/components/case-operations";
import DriveUploadPanel from "@/components/drive-upload-panel";
import MailMergePanel from "@/components/mail-merge-panel";
import { caseValues, type GeneratedDocument } from "@/lib/mail-merge";
import { loadTemplateLibrary } from "@/lib/template-data";
export default async function Case({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, role } = await requireStaff(),
    { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { data: r, error } = await supabase
    .from("suite_case_register")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load case");
  if (!r) notFound();
  const [client, legacy, docs, library] = await Promise.all([
    supabase
      .from("clients")
      .select("client_code,trading_as,address")
      .eq("id", r.client_id)
      .single(),
    supabase
      .from("ledger")
      .select("id,amount,type,status,date")
      .eq("case_id", id)
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("documents")
      .select("id,template_name,file_name,generated_at")
      .eq("case_id", id)
      .order("generated_at", { ascending: false })
      .limit(100),
    loadTemplateLibrary(supabase),
  ]);
  if (client.error || !client.data || legacy.error || docs.error)
    throw new Error("Could not load case history");
  return (
    <>
      <Navbar current="cases" role={role} />
      <main className="phase-page">
        <div className="page-top">
          <div>
            <p className="eyebrow">
              {r.case_reference} ·{" "}
              {r.tm_number ? `TM ${r.tm_number}` : "TM NOT ISSUED"}
            </p>
            <h1>{r.application_name || "Confirm case identity"}</h1>
            <p>
              {r.trading_as} · Stage {r.workflow_stage} ·{" "}
              {stepLabels[r.workflow_step] ?? r.workflow_step}
            </p>
          </div>
          <Link className="nb-button" href="/cases">
            ALL CASES
          </Link>
        </div>
        {r.followup && (
          <Card>
            <strong className={`workflow-flag ${r.followup.tone}`}>
              {r.followup.reason}
            </strong>
            {r.followup.due && (
              <p>Due {r.followup.due} · calendar days, holidays included</p>
            )}
          </Card>
        )}
        <div className="payment-summary">
          {[
            ["BILLED", r.billed],
            ["ALLOCATED", r.received],
            ["OUTSTANDING", r.outstanding],
          ].map(([label, v]) => (
            <Card key={label}>
              <p className="eyebrow">{label} · PKR</p>
              <strong>{money(v)}</strong>
            </Card>
          ))}
        </div>
        <p>
          Terms:{" "}
          {r.payment_terms === "monthly"
            ? "Monthly Billing / Credit"
            : "Advance Payment"}{" "}
          ·{" "}
          {Number(r.unpriced) > 0
            ? `${r.unpriced} charges need a rate`
            : "All issued charges priced"}
        </p>
        <CaseOperations
          key={r.updated_at}
          record={r}
          canWrite={role === "admin"}
        />
        <Card className="module-card">
          <DriveUploadPanel
            caseId={id}
            clientId={r.client_id}
            clientCode={r.client_code}
            caseNumber={r.case_number}
            defaultFolderName={`${r.client_code}-${r.case_number} ${r.application_name.slice(0, 140)}${r.tm_number ? " " + r.tm_number : ""}${r.nice_class ? " C" + r.nice_class : ""}`}
            canWrite={role === "admin"}
          />
        </Card>
        {legacy.data.length > 0 && (
          <details className="module-card">
            <summary>
              Historical paid/pending entries (read-only, not new ledger
              allocations)
            </summary>
            <Card>
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>DETAILS</th>
                    <th>AMOUNT</th>
                    <th>LEGACY STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {legacy.data.map((l) => (
                    <tr key={l.id}>
                      <td>{l.date}</td>
                      <td>{l.type}</td>
                      <td>{money(l.amount)}</td>
                      <td>{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <small>
                Latest 100 legacy entries. No automatic financial conversion was
                performed.
              </small>
            </Card>
          </details>
        )}
        <details className="module-card">
          <summary>
            Document generation & previous documents (separate workstream)
          </summary>
          <Card>
            <MailMergePanel
              caseId={id}
              values={caseValues(r, client.data)}
              categories={library.categories}
              templates={library.templates}
              documents={docs.data as GeneratedDocument[]}
              canGenerate={role === "admin"}
            />
          </Card>
        </details>
      </main>
    </>
  );
}
