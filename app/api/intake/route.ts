import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const origins = new Set(["fresh", "stage2", "stage3"]);
const maxImageBytes = 8 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Only Admin users can create cases." }, { status: 403 });

  const form = await request.formData();
  const clientId = String(form.get("client_id") ?? "").trim();
  const clientCode = String(form.get("client_code") ?? "").trim();
  const tradingAs = String(form.get("trading_as") ?? "").trim();
  const address = String(form.get("address") ?? "").trim();
  const casePrefix = String(form.get("case_prefix") ?? "").trim();
  const caseNumber = String(form.get("case_number") ?? "").trim();
  const origin = String(form.get("origin") ?? "").trim();
  if ((!clientId && (!clientCode || !tradingAs || !address)) || !casePrefix || !caseNumber || !origins.has(origin)) {
    return NextResponse.json({ error: "Complete the client, case number, and origin fields." }, { status: 400 });
  }

  let resolvedClientId = clientId;
  let createdClient = false;
  let caseId = "";
  const uploadedPaths: string[] = [];
  try {
    if (resolvedClientId) {
      const { data: existing, error } = await supabase.from("clients").select("id").eq("id", resolvedClientId).single();
      if (error || !existing) return NextResponse.json({ error: "Selected client was not found." }, { status: 400 });
    } else {
      const { data: client, error } = await supabase.from("clients").insert({ client_code: clientCode, trading_as: tradingAs, address }).select("id").single();
      if (error || !client) return NextResponse.json({ error: error?.message ?? "Could not create client." }, { status: 400 });
      resolvedClientId = client.id; createdClient = true;
    }

    const { data: caseRecord, error: caseError } = await supabase.from("cases").insert({ client_id: resolvedClientId, case_prefix: casePrefix, case_number: caseNumber, origin }).select("id, case_prefix, case_number").single();
    if (caseError || !caseRecord) throw new Error(caseError?.message ?? "Could not create case.");
    caseId = caseRecord.id;

    const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
    const images: Array<{ path: string; name: string; contentType: string; size: number }> = [];
    for (const file of files) {
      if (!imageTypes.has(file.type) || file.size > maxImageBytes) throw new Error("Images must be JPG, PNG, or WebP files under 8 MB each.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${caseId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("case-images").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      uploadedPaths.push(path); images.push({ path, name: file.name, contentType: file.type, size: file.size });
    }
    const { error: updateError } = await supabase.from("cases").update({ images }).eq("id", caseId);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ id: caseId, caseNumber: `${caseRecord.case_prefix}-${caseRecord.case_number}` }, { status: 201 });
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from("case-images").remove(uploadedPaths);
    if (caseId) await supabase.from("cases").delete().eq("id", caseId);
    if (createdClient && resolvedClientId) await supabase.from("clients").delete().eq("id", resolvedClientId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create case." }, { status: 400 });
  }
}
