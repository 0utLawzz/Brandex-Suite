import type { SupabaseClient } from "@supabase/supabase-js";
import type { MergeTemplate } from "@/lib/mail-merge";

export async function loadTemplateLibrary(supabase: SupabaseClient) {
  const categoriesQuery = supabase.from("template_categories").select("id, name").order("name");
  const templates: MergeTemplate[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("templates").select("id, name, category_id, content, allowed_origins, archived, description").order("name").order("id").range(offset, offset + 499);
    if (error) throw new Error("Could not load templates.");
    templates.push(...data as MergeTemplate[]); if (data.length < 500) break;
  }
  const { data: categories, error } = await categoriesQuery;
  if (error) throw new Error("Could not load categories.");
  return { templates, categories };
}
