import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/api-auth";
import { uuidPattern } from "@/lib/ledger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const auth = await apiStaff(); if (auth.response) return auth.response;
  const { id, documentId } = await params;
  if (!uuidPattern.test(id) || !uuidPattern.test(documentId)) return NextResponse.json({ error: "Invalid document." }, { status: 400 });
  const { data: document, error } = await auth.supabase.from("documents").select("generated_file_url, file_name").eq("id", documentId).eq("case_id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load document." }, { status: 500 });
  if (!document || document.generated_file_url !== `${id}/${documentId}.docx`) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { data: signed, error: signError } = await auth.supabase.storage.from("documents").createSignedUrl(document.generated_file_url, 60, { download: document.file_name });
  if (signError) return NextResponse.json({ error: "Could not prepare download." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl, { status: 303, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
