"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { coreFields, origins, placeholders, type MergeTemplate, type Category } from "@/lib/mail-merge";

export default function TemplateLibrary({ templates, categories, canWrite }: { templates: MergeTemplate[]; categories: Category[]; canWrite: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<MergeTemplate | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function send(url: string, method: string, body: object) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not save.");
    return result;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setBusy(true); setError(""); setMessage("");
    try {
      await send("/api/templates", editing ? "PATCH" : "POST", { id: editing?.id, name: data.get("name"), category_id: data.get("category_id"), content: text, description: data.get("description"), allowed_origins: data.getAll("origin"), archived: data.get("archived") === "on" });
      setEditing(null); setText(""); form.reset(); setMessage("Template saved."); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save template."); }
    finally { setBusy(false); }
  }
  async function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    setBusy(true); setError(""); setMessage("");
    try { await send("/api/template-categories", "POST", { name: new FormData(form).get("name") }); form.reset(); setMessage("Category added."); router.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not add category."); }
    finally { setBusy(false); }
  }
  return <><div className="template-grid">{templates.map(template => <Card key={template.id}><p className="eyebrow">{categories.find(category => category.id === template.category_id)?.name} {template.archived ? "/ ARCHIVED" : ""}</p><h2>{template.name}</h2><p className="muted">{template.description}</p><p>Origins: {template.allowed_origins.join(", ")}</p>{canWrite ? <Button disabled={busy} onClick={() => { setEditing(template); setText(template.content); setError(""); setMessage(""); document.getElementById("template-editor")?.scrollIntoView({ behavior: "smooth" }); }}>EDIT TEMPLATE</Button> : <details><summary>View template</summary><pre className="document-preview">{template.content}</pre></details>}</Card>)}</div>
    {!templates.length && <Card><p>No templates yet. Admins can add one below.</p></Card>}
    {canWrite && <Card className="module-card" id="template-editor"><h2>{editing ? "Edit template" : "New template"}</h2><p className="muted">Write plain text with placeholders. Generated files are editable Word documents. Archive a template to stop new generation while keeping its document history.</p><form key={editing?.id ?? "new"} onSubmit={save}><fieldset disabled={busy} className="form-grid">
      <div className="field"><label htmlFor="template-name">NAME</label><Input id="template-name" name="name" required maxLength={120} defaultValue={editing?.name ?? ""} /></div><div className="field"><label htmlFor="template-category">CATEGORY</label><select className="nb-input" id="template-category" name="category_id" defaultValue={editing?.category_id ?? categories[0]?.id} required>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div>
      <div className="field full"><label htmlFor="template-description">DESCRIPTION / LAYOUT NOTES</label><Input id="template-description" name="description" maxLength={2000} defaultValue={editing?.description ?? ""} /></div><div className="field full"><span className="field-label">ELIGIBLE CASE ORIGINS</span><div className="origin-checks">{origins.map(origin => <label key={origin}><input type="checkbox" name="origin" value={origin} defaultChecked={!editing || editing.allowed_origins.includes(origin)} /> {origin.toUpperCase()}</label>)}</div></div>
      <div className="field full"><label htmlFor="template-content">TEMPLATE TEXT</label><textarea id="template-content" className="nb-input template-text" maxLength={60000} value={text} onChange={event => setText(event.target.value)} required /></div><p className="placeholder-help full">Available: {coreFields.map(field => `{{${field}}}`).join(" · ")} · {"{{case_images}}"} (own line). Add fields with {"{{custom.field_name}}"}; the case page will ask for their values.</p><p className="muted full">Detected fields: {placeholders(text).join(", ") || "None"}</p><label className="full"><input type="checkbox" name="archived" defaultChecked={editing?.archived ?? false} /> ARCHIVED</label>
      <div className="actions full"><Button variant="accent" type="submit">{busy ? "SAVING…" : "SAVE TEMPLATE"}</Button>{editing && <Button onClick={() => { setEditing(null); setText(""); }}>CANCEL EDIT</Button>}</div>
    </fieldset></form><form onSubmit={addCategory} className="category-form"><h3>Add category</h3><div className="search-row"><Input name="name" aria-label="New category name" placeholder="NEW CATEGORY NAME" required maxLength={100} disabled={busy} /><Button type="submit" disabled={busy}>ADD CATEGORY</Button></div></form></Card>}
    {error && <p role="alert" className="notice error">{error}</p>}{message && <p role="status" className="notice success">{message}</p>}
  </>;
}
