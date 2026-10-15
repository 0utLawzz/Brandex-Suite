import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IntakeForm from "./intake-form";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/ui/navbar";

export default async function IntakePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return (<><Navbar current="intake" /><main className="phase-page">
        <Badge tone="accent">ADMIN ONLY</Badge>
        <p className="eyebrow">Brandex Suite / Case intake</p>
        <h1>Admin access required</h1>
        <p className="muted">Only Admin users can create clients, cases, and case-image uploads.</p>
        <Link className="nb-button nb-button-dark" href="/">BACK</Link>
      </main></>);
  }

  return <><Navbar current="intake" /><IntakeForm /></>;
}
