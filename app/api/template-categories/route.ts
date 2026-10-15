import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await apiStaff(true); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  if (typeof body?.name !== "string" || !body.name.trim() || body.name.length > 100) return NextResponse.json({ error: "Enter a category name up to 100 characters." }, { status: 400 });
  const { data, error } = await auth.supabase.from("template_categories").insert({ name: body.name.trim() }).select("id, name").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That category already exists." : "Could not create category." }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
