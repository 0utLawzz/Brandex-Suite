import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amountInCents, uuidPattern, validDate } from "@/lib/ledger";

type Context = { params: Promise<{ id: string }> };

async function writeEntry(request: Request, context: Context, method: "POST" | "PATCH" | "DELETE") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Only Admin users can change ledger entries." }, { status: 403 });

  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid case." }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (method !== "POST" && (typeof body.id !== "string" || !uuidPattern.test(body.id))) {
    return NextResponse.json({ error: "Invalid ledger entry." }, { status: 400 });
  }

  const { data: caseRecord, error: caseError } = await supabase.from("cases").select("id").eq("id", id).maybeSingle();
  if (caseError) return NextResponse.json({ error: "Could not load case." }, { status: 500 });
  if (!caseRecord) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  if (method === "DELETE") {
    const { data, error } = await supabase.from("ledger").delete().eq("case_id", id).eq("id", body.id).select("id").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not delete ledger entry." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Ledger entry not found." }, { status: 404 });
    return NextResponse.json({ id: data.id });
  }

  const cents = amountInCents(body.amount);
  const type = typeof body.type === "string" ? body.type.trim() : "";
  if (cents === null || !type || type.length > 100 || !["paid", "pending"].includes(body.status) || !validDate(body.date)) {
    return NextResponse.json({ error: "Enter a valid amount (up to two decimal places), type, paid/pending status, and date." }, { status: 400 });
  }
  // Only explicitly allowed fields are written; the case comes from the route.
  const entry = { amount: (cents / 100).toFixed(2), type, status: body.status, date: body.date };
  const query = method === "POST"
    ? supabase.from("ledger").insert({ ...entry, case_id: id })
    : supabase.from("ledger").update(entry).eq("case_id", id).eq("id", body.id);
  const { data, error } = await query.select("id, amount, type, status, date").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save ledger entry." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Ledger entry not found." }, { status: 404 });
  return NextResponse.json(data, { status: method === "POST" ? 201 : 200 });
}

export const POST = (request: Request, context: Context) => writeEntry(request, context, "POST");
export const PATCH = (request: Request, context: Context) => writeEntry(request, context, "PATCH");
export const DELETE = (request: Request, context: Context) => writeEntry(request, context, "DELETE");
