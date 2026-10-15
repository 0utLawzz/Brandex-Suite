import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "");
  if (!/^[a-zA-Z0-9_-]{20,200}$/.test(tokenHash) || (type !== "recovery" && type !== "invite")) return NextResponse.redirect(new URL("/login?error=setup", request.url), 303);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return NextResponse.redirect(new URL(error ? "/login?error=setup" : "/account/password", request.url), { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
