import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { uuidPattern } from "@/lib/ledger";
import { Navbar } from "@/components/ui/navbar";
import AccountPanel from "@/components/account-panel";
export default async function Account({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role, supabase } = await requireStaff(),
    { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id,client_code,trading_as,payment_terms,stage_rates,city")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load account");
  if (!client) notFound();
  return (
    <>
      <Navbar role={role} />
      <main className="phase-page">
        <div className="page-top">
          <div>
            <p className="eyebrow">CLIENT LEDGER · PKR</p>
            <h1>
              {client.client_code} · {client.trading_as}
            </h1>
          </div>
          <Link className="nb-button" href="/accounts">
            ALL ACCOUNTS
          </Link>
        </div>
        <AccountPanel client={client} canWrite={role === "admin"} />
      </main>
    </>
  );
}
