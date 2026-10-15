import { requireStaff } from "@/lib/auth";
import { loadTemplateLibrary } from "@/lib/template-data";
import { Navbar } from "@/components/ui/navbar";
import TemplateLibrary from "./template-library";

export default async function TemplatesPage() {
  const { supabase, role } = await requireStaff();
  const { templates, categories } = await loadTemplateLibrary(supabase);
  return <><Navbar current="templates" role={role} /><main className="phase-page"><p className="eyebrow">BRANDEX SUITE / DOCUMENTS</p><h1>Template library</h1><p className="muted">Manage reusable document text, categories, and eligible case origins.</p><TemplateLibrary templates={templates} categories={categories} canWrite={role === "admin"} /></main></>;
}
