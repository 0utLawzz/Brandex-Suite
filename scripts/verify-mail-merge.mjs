// Requires the same local/linked test setup as verify-ledger.mjs. All fixtures
// are isolated and removed in finally. Service access is used only for setup.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import JSZip from "jszip";
createRequire(import.meta.url)("@next/env").loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.env.BRANDEX_TEST_BASE_URL ?? "http://localhost:3000";
const project = new URL(url).hostname.split(".")[0]; assert.match(project, /^[a-z0-9]+$/);
const key = process.env.BRANDEX_TEST_SERVICE_KEY ?? JSON.parse(execSync(`supabase projects api-keys --project-ref ${project} --output json`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })).find(item => item.name === "service_role").api_key;
const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [], sessions = [], templates = [], cases = [], clients = [], categories = [];
const run = crypto.randomUUID().slice(0, 8); let checks = 0;
function check(value, name) { assert.ok(value, name); console.log("PASS " + name); checks++; }
async function staff(role) {
  const email = `merge-${run}-${role}@example.com`, password = crypto.randomUUID() + "Aa1!";
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(error); users.push(data.user.id);
  assert.ifError((await service.from("profiles").update({ role }).eq("id", data.user.id)).error);
  const jar = new Map(); const client = createServerClient(url, anon, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(value => jar.set(value.name, value.value)) } });
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error); sessions.push(client);
  return { id: data.user.id, client, cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
}
async function api(role, path, method = "GET", body) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { Cookie: role?.cookie ?? "", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, location: response.headers.get("location") };
}
try {
  const admin = await staff("admin"), viewer = await staff("viewer"), agent = await staff("agent");
  let r = await api(admin, "/api/template-categories", "POST", { name: "TEST-MERGE-" + run }); check(r.status === 201, "Admin creates data-driven category"); const categoryId = r.data.id; categories.push(categoryId);
  const template = { name: "Test template " + run, category_id: categoryId, content: "Client: {{trading_as}}\nCase: {{case_code}}\nFor: {{custom.recipient}}\n{{case_images}}", description: "Test", allowed_origins: ["fresh"], archived: false };
  r = await api(admin, "/api/templates", "POST", template); check(r.status === 201, "Admin creates template"); const templateId = r.data.id; templates.push(templateId);
  check((await api(admin, "/api/templates", "POST", { ...template, content: "{{unsupported}}" })).status === 400, "unknown placeholder rejected");
  const { data: client, error } = await service.from("clients").insert({ client_code: "MERGE-" + run, trading_as: "A&B Foods", address: "Test address" }).select("id").single(); assert.ifError(error); clients.push(client.id);
  const { data: records, error: casesError } = await service.from("cases").insert([{ client_id: client.id, case_prefix: "TEST", case_number: run, origin: "fresh", assigned_agent_id: agent.id }, { client_id: client.id, case_prefix: "TEST", case_number: run + "B", origin: "stage2" }]).select("id, origin"); assert.ifError(casesError); cases.push(...records.map(record => record.id));
  const id = records.find(record => record.origin === "fresh").id, otherId = records.find(record => record.origin === "stage2").id;
  const imagePath = `${id}/test.png`; const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhCkAAAAASUVORK5CYII=", "base64");
  assert.ifError((await service.storage.from("case-images").upload(imagePath, png, { contentType: "image/png" })).error);
  assert.ifError((await service.from("cases").update({ images: [{ path: imagePath }] }).eq("id", id)).error);
  const body = { template_id: templateId, request_id: crypto.randomUUID(), custom_fields: { "custom.recipient": "Test recipient" } };
  const endpoint = `/api/cases/${id}/documents`;
  check((await api(null, endpoint, "POST", body)).status === 401, "anonymous generation rejected");
  for (const role of [viewer, agent]) {
    check((await api(role, endpoint, "POST", body)).status === 403, "non-Admin generation rejected");
    check((await api(role, "/api/templates", "POST", template)).status === 403, "non-Admin template write rejected");
    check((await api(role, "/api/template-categories", "POST", { name: "Forbidden" })).status === 403, "non-Admin category write rejected");
    check(Boolean((await role.client.from("documents").insert({ case_id: id, template_id: templateId, generated_file_url: `${id}/bad.docx` })).error), "direct document insert blocked by RLS");
    check(Boolean((await role.client.storage.from("documents").upload(`${id}/bad.docx`, Buffer.from("test"))).error), "direct document upload blocked by RLS");
  }
  check((await api(admin, endpoint, "POST", { ...body, custom_fields: {} })).status === 400, "missing additional field rejected");
  check((await api(admin, endpoint, "POST", { ...body, custom_fields: { ...body.custom_fields, trading_as: "Override" } })).status === 400, "core-field override rejected");
  check((await api(admin, `/api/cases/${otherId}/documents`, "POST", body)).status === 400, "origin eligibility enforced on server");
  r = await api(admin, endpoint, "POST", body); check(r.status === 201, "Admin generates and logs Word document"); const documentId = r.data.id;
  r = await api(admin, endpoint, "POST", body); check(r.status === 200 && r.data.id === documentId, "retry returns same document without duplication");
  const { data: document } = await service.from("documents").select("*").eq("id", documentId).single();
  check(document.generated_file_url === `${id}/${documentId}.docx` && document.generated_by === admin.id && document.snapshot.custom_fields["custom.recipient"] === "Test recipient", "private storage path and generation snapshot recorded");
  for (const role of [admin, viewer, agent]) check((await api(role, `${endpoint}/${documentId}`)).status === 303, "authorized role receives short-lived download");
  check((await api(agent, `/api/cases/${otherId}/documents/${documentId}`)).status === 404, "cross-case document lookup rejected");
  check((await api(null, `${endpoint}/${documentId}`)).status === 401, "anonymous document lookup rejected");
  const download = await api(admin, `${endpoint}/${documentId}`); const fileResponse = await fetch(download.location); check(fileResponse.status === 200, "signed download returns saved file");
  const bytes = Buffer.from(await fileResponse.arrayBuffer()); const zip = await JSZip.loadAsync(bytes); const xml = await zip.file("word/document.xml").async("string");
  check(xml.includes("A&amp;B Foods") && xml.includes("Test recipient") && !xml.includes("{{"), "document contains merged values with no unresolved fields");
  check(Object.keys(zip.files).some(path => path.startsWith("word/media/") && path.endsWith(".png")), "case image embedded in Word file");
  mkdirSync("work", { recursive: true }); writeFileSync("work/verified-mail-merge.docx", bytes);
  const publicUrl = service.storage.from("documents").getPublicUrl(document.generated_file_url).data.publicUrl;
  check((await fetch(publicUrl)).status !== 200, "document bucket remains private");
  r = await api(admin, "/api/templates", "PATCH", { ...template, id: templateId, content: "Changed {{trading_as}}", archived: true }); check(r.status === 200, "Admin edits and archives template");
  check((await api(admin, endpoint, "POST", { ...body, request_id: crypto.randomUUID() })).status === 404, "archived template cannot generate new documents");
  check((await api(viewer, `${endpoint}/${documentId}`)).status === 303, "archiving preserves historical document access");
  const stored = await service.from("documents").select("snapshot").eq("id", documentId).single(); check(stored.data.snapshot.content === template.content, "template edits do not change historical snapshot");
  check((await api(admin, "/templates")).status === 200, "template library renders");
  check((await api(null, "/preview")).status === 200, "public sample preview renders without a login");
  console.log(`${checks} mail-merge checks passed.`);
} finally {
  for (const id of cases) {
    for (const bucket of ["documents", "case-images"]) { const { data } = await service.storage.from(bucket).list(id); if (data?.length) assert.ifError((await service.storage.from(bucket).remove(data.map(file => `${id}/${file.name}`))).error); }
    assert.ifError((await service.from("cases").delete().eq("id", id)).error);
  }
  for (const id of clients) assert.ifError((await service.from("clients").delete().eq("id", id)).error);
  for (const id of templates) assert.ifError((await service.from("templates").delete().eq("id", id)).error);
  for (const id of categories) assert.ifError((await service.from("template_categories").delete().eq("id", id)).error);
  for (const client of sessions) await client.auth.signOut();
  for (const id of users) assert.ifError((await service.auth.admin.deleteUser(id)).error);
  console.log("Temporary mail-merge users, records, and files removed.");
}
