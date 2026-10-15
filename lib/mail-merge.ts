export const origins = ["fresh", "stage2", "stage3"] as const;
export const coreFields = ["client_code", "trading_as", "address", "case_prefix", "case_number", "case_code", "origin", "stage", "status", "assessment", "generated_date"] as const;
export type MergeValues = Record<string, string>;
export type MergeTemplate = { id: string; name: string; category_id: string; content: string; allowed_origins: string[]; archived: boolean; description: string };
export type Category = { id: string; name: string };
export type GeneratedDocument = { id: string; template_name: string; file_name: string; generated_at: string };

export function placeholders(content: string): string[] {
  return [...new Set([...content.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(match => match[1]))];
}

export function validateTemplate(content: unknown): string | null {
  if (typeof content !== "string" || !content.trim() || content.length > 60000) return "Enter template text up to 60,000 characters.";
  const fields = placeholders(content);
  if (fields.length > 100) return "Use no more than 100 distinct placeholders per template.";
  for (const field of fields) {
    if (!(coreFields as readonly string[]).includes(field) && field !== "case_images" && !/^custom\.[a-z][a-z0-9_]{0,49}$/.test(field)) {
      return `Unsupported placeholder: ${field}. Use a listed field or custom.field_name.`;
    }
  }
  if (content.replace(/\{\{\s*[^{}]+?\s*\}\}/g, "").match(/\{\{|\}\}/)) return "A placeholder has unmatched braces.";
  if (content.split("\n").some(line => { const image = line.match(/\{\{\s*case_images\s*\}\}/); return image && line.trim() !== image[0]; })) return "Place {{case_images}} on its own line.";
  return null;
}

export function customFields(content: string) { return placeholders(content).filter(field => field.startsWith("custom.")); }

export function mergeText(content: string, values: MergeValues, custom: MergeValues = {}, imageLabel = "[Case images]") {
  return content.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, field: string) => {
    if (field === "case_images") return imageLabel;
    if (field.startsWith("custom.")) return custom[field] ?? `[${field.slice(7).replaceAll("_", " ")}]`;
    return values[field] ?? "";
  });
}

export function caseValues(record: Record<string, unknown>, client: Record<string, unknown>, date = new Date()): MergeValues {
  const values: MergeValues = {};
  for (const key of coreFields) values[key] = String(record[key] ?? client[key] ?? "");
  values.case_code = `${record.case_prefix}-${record.case_number}`;
  values.generated_date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return values;
}
