import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { uuidPattern } from "@/lib/ledger";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; page?: string }>;
}) {
  const { role, supabase } = await requireStaff(),
    q = await searchParams,
    page = Math.max(1, Math.min(Number(q.page) || 1, 100000));
  if (q.ref && !uuidPattern.test(q.ref))
    throw new Error("Invalid audit reference");
  let query = supabase
    .from("suite_audit")
    .select("id,entity,row_ref,old_value,new_value,actor,created_at", {
      count: "exact",
    })
    .order("id", { ascending: false })
    .range((page - 1) * 30, page * 30 - 1);
  if (q.ref) query = query.eq("row_ref", q.ref);
  const { data, error, count } = await query;
  if (error) throw new Error("Could not load audit history");
  return (
    <>
      <Navbar role={role} />
      <main className="phase-page">
        <h1>Audit history</h1>
        <p>
          Actor, time, previous and revised values. Workflow events remain on
          each case.
        </p>
        {data.map((a) => (
          <Card key={a.id} className="module-card">
            <strong>
              {a.created_at} · {a.entity}
            </strong>
            <p>
              Actor {a.actor ?? "System"} · Reference {a.row_ref}
            </p>
            <details>
              <summary>Previous / revised details</summary>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {JSON.stringify(
                  { before: a.old_value, after: a.new_value },
                  null,
                  2,
                )}
              </pre>
            </details>
          </Card>
        ))}
        {!data.length && <p>No revisions for this reference.</p>}
        <div className="actions">
          {page > 1 && (
            <Link
              className="nb-button"
              href={`/audit?ref=${q.ref ?? ""}&page=${page - 1}`}
            >
              PREVIOUS
            </Link>
          )}
          {page * 30 < (count ?? 0) && (
            <Link
              className="nb-button"
              href={`/audit?ref=${q.ref ?? ""}&page=${page + 1}`}
            >
              NEXT
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
