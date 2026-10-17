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
  const mark = String(form.get("application_name")??"").trim();
  const tm=String(form.get("tm_number")??"").replace(/[\s-]/g,"");
  const niceClass=String(form.get("nice_class")??"").trim();
  if(!mark||mark.length>200||!/^\d{1,6}$/.test(caseNumber)||(tm&&!/^\d{6}$/.test(tm))||(niceClass&&(!/^\d{1,2}$/.test(niceClass)||Number(niceClass)<1||Number(niceClass)>45)))return NextResponse.json({error:"Enter mark name, manual case number, optional six-digit TM and Class 1–45."},{status:400});
  const canonicalCase=caseNumber.padStart(3,"0");
  const normalizedCode=clientCode.toUpperCase().replace(/\s/g,"");
  if(!clientId&&!/^[A-Z][A-Z0-9]{0,11}-[0-9]{3,6}$/.test(normalizedCode))return NextResponse.json({error:"Client code must be SERIES-123."},{status:400});
  let rates:Record<string,number>={};
  try{for(let stage=1;stage<=4;stage++){const v=String(form.get(`rate_${stage}`)??"").trim();if(v){if(!/^\d{1,10}(\.\d{1,2})?$/.test(v)||Number(v)>9999999999.99)throw new Error();rates[String(stage)]=Number(v);}}}catch{return NextResponse.json({error:"Enter valid stage rates."},{status:400});}
  if ((!clientId && (!clientCode || !tradingAs || !address)) || !casePrefix || !caseNumber || !origins.has(origin)) {
    return NextResponse.json({ error: "Complete the client, case number, and origin fields." }, { status: 400 });
  }

  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.some(file => !imageTypes.has(file.type) || file.size > maxImageBytes)) {
    return NextResponse.json({ error: "Images must be JPG, PNG, or WebP files under 8 MB each." }, { status: 400 });
  }

  let resolvedClientId = clientId;
  let createdClient = false;
  let caseId = "";
  const uploadedPaths: string[] = [];
  try {
    if (resolvedClientId) {
      const { data: existing, error } = await supabase.from("clients").select("id,client_code").eq("id", resolvedClientId).single();
      if (existing && !/^[A-Z][A-Z0-9]{0,11}-[0-9]{3,6}$/.test(existing.client_code)) return NextResponse.json({error:"Align this client code in Client Ledger before registering another case."},{status:400});
      if (error || !existing) return NextResponse.json({ error: "Selected client was not found." }, { status: 400 });
    } else {
      const {data: configured}=await supabase.from("case_series").select("code").eq("code",normalizedCode.split("-")[0]).maybeSingle();
      if(!configured)return NextResponse.json({error:"Add this client series first."},{status:400});
      const { data: client, error } = await supabase.from("clients").insert({ client_code: normalizedCode, trading_as: tradingAs, address, city:String(form.get("city")??"").trim().slice(0,120), stage_rates:rates, payment_terms:form.get("payment_terms")==="advance"?"advance":"monthly" }).select("id").single();
      if (error || !client) return NextResponse.json({ error: error?.message ?? "Could not create client." }, { status: 400 });
      resolvedClientId = client.id; createdClient = true;
    }

    const { data: caseRecord, error: caseError } = await supabase.from("cases").insert({ client_id: resolvedClientId, case_prefix: casePrefix, case_number: canonicalCase, origin, application_name:mark, tm_number:tm||null, nice_class:niceClass?Number(niceClass):null,identity_confirmed:true,workflow_stage:origin==="stage2"?2:origin==="stage3"?3:1,workflow_step:origin==="fresh"?"registered":"review" }).select("id, case_prefix, case_number").single();
    if (caseError || !caseRecord) throw new Error(caseError?.message ?? "Could not create case.");
    caseId = caseRecord.id;

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
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from("case-images").remove(uploadedPaths);
      if (cleanupError) return NextResponse.json({ error: `Upload failed and image cleanup could not finish. Case ${caseId} was kept for Admin recovery.` }, { status: 500 });
    }
    if (caseId) return NextResponse.json({id:caseId,caseNumber:canonicalCase,warning:"Case registered; supporting image upload failed. The case and charge were preserved."},{status:201});
    if (createdClient && resolvedClientId) {
      const { error: cleanupError } = await supabase.from("clients").delete().eq("id", resolvedClientId);
      if (cleanupError) return NextResponse.json({ error: `Registration failed and client ${resolvedClientId} could not be removed. Admin recovery is required.` }, { status: 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create case." }, { status: 400 });
  }
}
