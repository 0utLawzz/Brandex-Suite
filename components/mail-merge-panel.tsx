"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customFields, mergeText, type MergeTemplate, type MergeValues, type Category, type GeneratedDocument } from "@/lib/mail-merge";

export default function MailMergePanel({ caseId, values, categories, templates, documents, canGenerate, demo = false }: { caseId: string; values: MergeValues; categories: Category[]; templates: MergeTemplate[]; documents: GeneratedDocument[]; canGenerate: boolean; demo?: boolean }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const eligible = templates.filter(template => !template.archived && template.allowed_origins.includes(values.origin) && (!categoryId || template.category_id === categoryId));
  const [templateId, setTemplateId] = useState("");
  const selected = eligible.find(template => template.id === templateId) ?? eligible[0];
  const [custom, setCustom] = useState<MergeValues>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [downloadId, setDownloadId] = useState("");
  const requestId = useRef<string | null>(null);
  function changeTemplate() { setCustom({}); setError(""); setMessage(""); requestId.current = null; }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); if (!selected || demo || !canGenerate) return;
    setBusy(true); setError(""); setMessage("");
    requestId.current ??= crypto.randomUUID();
    try {
      const fields = Object.fromEntries(customFields(selected.content).map(field => [field, custom[field] ?? ""]));
      const response = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template_id: selected.id, custom_fields: fields, request_id: requestId.current }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not generate document.");
      setDownloadId(body.id); setMessage("Word document generated and saved to this case."); requestId.current = null; router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not generate document."); }
    finally { setBusy(false); }
  }
  return <><div className="section-heading"><div><p className="section-label">DOCUMENT GENERATION</p><h2>Mail merge</h2></div>{!demo && <Link className="nb-button" href="/templates">TEMPLATE LIBRARY</Link>}</div>
    <p className="muted">Choose a category and template. Saved client and case details fill automatically; additional fields are specific to this document.</p>
    <form onSubmit={generate}><fieldset disabled={busy} className="form-grid"><div className="field"><label htmlFor="merge-category">CATEGORY</label><select id="merge-category" className="nb-input" value={categoryId} onChange={event => { setCategoryId(event.target.value); setTemplateId(""); changeTemplate(); }}><option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div className="field"><label htmlFor="merge-template">TEMPLATE</label><select id="merge-template" className="nb-input" value={selected?.id ?? ""} onChange={event => { setTemplateId(event.target.value); changeTemplate(); }}>{!eligible.length && <option value="">No eligible templates</option>}{eligible.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
      {selected && <><p className="muted full">{selected.description}</p>{customFields(selected.content).map(field => <div className="field" key={`${selected.id}-${field}`}><label htmlFor={field}>{field.slice(7).replaceAll("_", " ").toUpperCase()}</label><Input id={field} maxLength={5000} value={custom[field] ?? ""} required onChange={event => { setCustom({ ...custom, [field]: event.target.value }); requestId.current = null; }} /></div>)}<div className="field full"><span className="field-label">MERGED TEXT PREVIEW</span><pre className="document-preview">{mergeText(selected.content, values, custom)}</pre><small className="muted">The Word file uses an A4 layout. Case images appear in the generated document where the image marker is placed.</small></div></>}
      <div className="actions full">{demo ? <Link className="nb-button nb-button-accent" href="/login">SIGN IN TO GENERATE</Link> : canGenerate ? <Button variant="accent" type="submit" disabled={!selected || busy}>{busy ? "GENERATING…" : "GENERATE WORD DOCUMENT"}</Button> : <p className="muted">Only Admins can generate documents. You can view permitted case documents below.</p>}</div>
    </fieldset></form>
    {error && <p role="alert" className="notice error">{error}</p>}{message && <p role="status" className="notice success">{message} <a href={`/api/cases/${caseId}/documents/${downloadId}`}>DOWNLOAD WORD FILE</a></p>}
    {!demo && <><h3>Generated documents</h3>{documents.length ? <ul className="document-list">{documents.map(document => <li key={document.id}><div><strong>{document.template_name || "Document"}</strong><small>{new Date(document.generated_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</small></div><a className="nb-button" href={`/api/cases/${caseId}/documents/${document.id}`}>DOWNLOAD</a></li>)}</ul> : <p className="muted">No documents generated yet.</p>}</>}
  </>;
}
