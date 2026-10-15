import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/api-auth";
import { uuidPattern } from "@/lib/ledger";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiStaff(); if (auth.response) return auth.response;
  if (auth.role === "viewer") return NextResponse.json({ error: "Viewer access is read-only." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!uuidPattern.test(id) || !body || Array.isArray(body) || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const allowed = ["status", "assessment", "expected_updated_at"];
  if (Object.keys(body).some(key => !allowed.includes(key)) || typeof body.status !== "string" || !body.status.trim() || body.status.length > 80 || typeof body.assessment !== "string" || body.assessment.length > 10000 || typeof body.expected_updated_at !== "string" || body.expected_updated_at.length > 50 || Number.isNaN(Date.parse(body.expected_updated_at))) return NextResponse.json({ error: "Enter a status (up to 80 characters) and assessment (up to 10,000 characters). Reload if the case has changed." }, { status: 400 });
  const { data: record, error } = await auth.supabase.from("cases").select("id, assigned_agent_id").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load case." }, { status: 500 });
  if (!record) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  if (auth.role === "agent" && record.assigned_agent_id !== auth.user.id) return NextResponse.json({ error: "This case is not assigned to you." }, { status: 403 });
  const { data, error: updateError } = await auth.supabase.from("cases").update({ status: body.status.trim(), assessment: body.assessment.trim() || null }).eq("id", id).eq("updated_at", body.expected_updated_at).select("id, status, assessment, updated_at").maybeSingle();
  if (updateError) return NextResponse.json({ error: "Could not update case." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "The case or its assignment changed. Reload before saving." }, { status: 409 });
  return NextResponse.json(data);
}
