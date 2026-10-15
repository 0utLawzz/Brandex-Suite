import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/api-auth";
import { uuidPattern } from "@/lib/ledger";
import { caseValues, customFields, mergeText, placeholders, validateTemplate } from "@/lib/mail-merge";
import { buildDocument } from "@/lib/document-builder";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiStaff(true); if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!uuidPattern.test(id) || typeof body?.template_id !== "string" || !uuidPattern.test(body.template_id) || typeof body?.request_id !== "string" || !uuidPattern.test(body.request_id)) return NextResponse.json({ error: "Invalid case, template, or generation request." }, { status: 400 });
  const { data: existing } = await supabase.from("documents").select("id").eq("id", body.request_id).eq("case_id", id).maybeSingle();
  if (existing) return NextResponse.json(existing);
  const [{ data: record, error: caseError }, { data: template, error: templateError }] = await Promise.all([
    supabase.from("cases").select("*").eq("id", id).maybeSingle(),
    supabase.from("templates").select("*").eq("id", body.template_id).eq("archived", false).maybeSingle(),
  ]);
  if (caseError || templateError) return NextResponse.json({ error: "Could not load generation data." }, { status: 500 });
  if (!record || !template) return NextResponse.json({ error: "Case or active template not found." }, { status: 404 });
  if (!template.allowed_origins.includes(record.origin)) return NextResponse.json({ error: "This template is not enabled for this case origin." }, { status: 400 });
  const templateProblem = validateTemplate(template.content);
  if (templateProblem) return NextResponse.json({ error: templateProblem }, { status: 400 });
  const custom = body.custom_fields ?? {};
  if (typeof custom !== "object" || !custom || Array.isArray(custom)) return NextResponse.json({ error: "Invalid additional fields." }, { status: 400 });
  const required = customFields(template.content);
  if (Object.keys(custom).some(field => !required.includes(field)) || required.some(field => typeof custom[field] !== "string" || !custom[field].trim() || custom[field].length > 5000)) return NextResponse.json({ error: "Complete the additional template fields (up to 5,000 characters each)." }, { status: 400 });
  const { data: client, error: clientError } = await supabase.from("clients").select("*").eq("id", record.client_id).single();
  if (clientError) return NextResponse.json({ error: "Could not load client." }, { status: 500 });
  const values = caseValues(record, client);
  const text = mergeText(template.content, values, custom, "[[BRANDEX_CASE_IMAGES]]");
  const path = `${id}/${body.request_id}.docx`;
  const filename = `${values.case_code}-${template.name}`.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160) + ".docx";
  try {
    const images: Buffer[] = [];
    if (placeholders(template.content).includes("case_images")) {
      if (!Array.isArray(record.images) || !record.images.length || record.images.length > 10) throw new Error("This template needs 1–10 case images captured at intake.");
      for (const image of record.images) {
        if (typeof image.path !== "string" || !image.path.startsWith(`${id}/`) || image.path.includes("..")) throw new Error("A case image reference is invalid.");
        const { data, error } = await supabase.storage.from("case-images").download(image.path);
        if (error || !data || data.size > 8 * 1024 * 1024) throw new Error("Could not load a case image (maximum 8 MB per image).");
        images.push(Buffer.from(await data.arrayBuffer()));
      }
    }
    const output = await buildDocument(template.name, text, images);
    const contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, output, { contentType, upsert: false });
    if (uploadError) return NextResponse.json({ error: "Document upload could not finish. Retry this generation request." }, { status: 409 });
    const { data, error: logError } = await supabase.from("documents").insert({ id: body.request_id, case_id: id, template_id: template.id, generated_file_url: path, generated_by: user.id, template_name: template.name, file_name: filename, snapshot: { content: template.content, values, custom_fields: custom } }).select("id").single();
    if (logError) {
      const { error: cleanupError } = await supabase.storage.from("documents").remove([path]);
      return NextResponse.json({ error: cleanupError ? `Generation log failed; Admin must remove unlogged file ${path}.` : "Generation log failed. The uploaded file was removed; please retry." }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (failure) { return NextResponse.json({ error: failure instanceof Error ? failure.message : "Could not generate document." }, { status: 400 }); }
}
