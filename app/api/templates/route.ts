import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/api-auth";
import { origins, placeholders, validateTemplate } from "@/lib/mail-merge";
import { uuidPattern } from "@/lib/ledger";

async function save(request: Request, update: boolean) {
  const auth = await apiStaff(true); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (update && (typeof body.id !== "string" || !uuidPattern.test(body.id))) return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  const problem = validateTemplate(body.content);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120 || typeof body.category_id !== "string" || !uuidPattern.test(body.category_id) || !Array.isArray(body.allowed_origins) || !body.allowed_origins.length || body.allowed_origins.some((origin: unknown) => !(origins as readonly unknown[]).includes(origin)) || typeof body.archived !== "boolean" || (body.description != null && (typeof body.description !== "string" || body.description.length > 2000))) return NextResponse.json({ error: "Complete the name, category, and eligible origins." }, { status: 400 });
  const value = { name: body.name.trim(), category_id: body.category_id, content: body.content, placeholders: placeholders(body.content), allowed_origins: [...new Set(body.allowed_origins)], archived: body.archived, description: body.description ?? "" };
  const query = update ? auth.supabase.from("templates").update(value).eq("id", body.id) : auth.supabase.from("templates").insert(value);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save template. Check its category and try again." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json(data, { status: update ? 200 : 201 });
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
