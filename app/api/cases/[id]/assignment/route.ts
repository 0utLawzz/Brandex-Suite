import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/api-auth";
import { uuidPattern } from "@/lib/ledger";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiStaff(true); if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!uuidPattern.test(id) || !body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !["assigned_agent_id", "expected_updated_at"].includes(key)) || (body.assigned_agent_id !== null && (typeof body.assigned_agent_id !== "string" || !uuidPattern.test(body.assigned_agent_id))) || typeof body.expected_updated_at !== "string" || body.expected_updated_at.length > 50 || Number.isNaN(Date.parse(body.expected_updated_at))) return NextResponse.json({ error: "Choose an Agent or Unassigned, then reload if the case has changed." }, { status: 400 });
  if (body.assigned_agent_id) {
    const { data: agent, error } = await auth.supabase.from("profiles").select("id").eq("id", body.assigned_agent_id).eq("role", "agent").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not load agent." }, { status: 500 });
    if (!agent) return NextResponse.json({ error: "Only an Agent account can be assigned." }, { status: 400 });
  }
  const { data: record, error } = await auth.supabase.from("cases").select("id").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load case." }, { status: 500 });
  if (!record) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  const { data, error: updateError } = await auth.supabase.from("cases").update({ assigned_agent_id: body.assigned_agent_id }).eq("id", id).eq("updated_at", body.expected_updated_at).select("id, assigned_agent_id, updated_at").maybeSingle();
  if (updateError) return NextResponse.json({ error: "Could not save assignment." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "The case changed. Reload before assigning it." }, { status: 409 });
  return NextResponse.json(data);
}
