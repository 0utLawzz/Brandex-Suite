import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function apiStaff(adminOnly = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "viewer", "agent"].includes(profile.role) || (adminOnly && profile.role !== "admin")) return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  return { supabase, user, role: profile.role as "admin" | "viewer" | "agent" };
}
