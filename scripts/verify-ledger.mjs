// Historical verification for the pre-operations schema; preserved for reference.
throw new Error("Superseded: use verify-operations-db.mjs, verify-operations-live.mjs and verify-drive-identity.mjs. This historical script must not create legacy Agent fixtures in the current schema.");
// Run against a local app and the linked disposable-test project:
// BRANDEX_TEST_SERVICE_KEY=<server-only key> node scripts/verify-ledger.mjs
// If omitted, the authenticated Supabase CLI supplies the key in memory.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

createRequire(import.meta.url)("@next/env").loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.env.BRANDEX_TEST_BASE_URL ?? "http://localhost:3000";
const project = new URL(url).hostname.split(".")[0];
assert.match(project, /^[a-z0-9]+$/, "Expected a Supabase project hostname");
const key = process.env.BRANDEX_TEST_SERVICE_KEY ?? JSON.parse(execSync(`supabase projects api-keys --project-ref ${project} --output json`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })).find(item => item.name === "service_role").api_key;
const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];
const cases = [];
const clients = [];
const sessions = [];
const run = crypto.randomUUID().slice(0, 8);
let checks = 0;
function check(condition, name) { assert.ok(condition, name); checks++; console.log(`PASS ${name}`); }
async function api(role, path, method, body) {
  const response = await fetch(`${base}${path}`, { method, redirect: "manual", headers: { Cookie: role?.cookie ?? "", ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, location: response.headers.get("location") };
}
async function staff(role) {
  const email = `brandex-${run}-${role}@example.com`;
  const password = crypto.randomUUID() + "Aa1!";
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error); users.push(data.user.id);
  assert.ifError((await service.from("profiles").update({ role }).eq("id", data.user.id)).error);
  const jar = new Map();
  const client = createServerClient(url, anon, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cookies => cookies.forEach(cookie => jar.set(cookie.name, cookie.value)) } });
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
  sessions.push(client);
  return { id: data.user.id, client, cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
}
try {
  const admin = await staff("admin"), viewer = await staff("viewer"), agent = await staff("agent");
  check((await api(null, "/cases", "GET")).location?.includes("/login"), "anonymous case access redirects to sign-in");
  const form = new FormData();
  form.set("client_code", `TEST-${run}`); form.set("trading_as", "Ledger verification client"); form.set("address", "Test address");
  form.set("case_prefix", "TEST"); form.set("case_number", run); form.set("origin", "fresh");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhCkAAAAASUVORK5CYII=", "base64");
  form.set("images", new Blob([png], { type: "image/png" }), "test.png");
  let response = await api(admin, "/api/intake", "POST", form);
  check(response.status === 201, "Admin intake saves client, case, and image");
  const id = response.data.id; cases.push(id);
  const { data: record } = await service.from("cases").select("client_id, images").eq("id", id).single(); clients.push(record.client_id);
  check(record.images.length === 1 && record.images[0].path.startsWith(id + "/"), "image reference belongs to new case");
  const reused = new FormData(); reused.set("client_id", record.client_id); reused.set("case_prefix", "TEST"); reused.set("case_number", run + "B"); reused.set("origin", "stage2");
  response = await api(admin, "/api/intake", "POST", reused);
  check(response.status === 201, "Admin intake reuses existing client"); cases.push(response.data.id);
  const otherId = response.data.id;
  assert.ifError((await service.from("cases").update({ assigned_agent_id: agent.id }).eq("id", id)).error);
  const endpoint = `/api/cases/${id}/ledger`;
  const entry = { amount: "125.50", type: "Filing fee", status: "pending", date: "2026-10-15" };
  check((await api(null, endpoint, "POST", entry)).status === 401, "unauthenticated ledger writes rejected");
  for (const role of [viewer, agent]) {
    for (const method of ["POST", "PATCH", "DELETE"]) check((await api(role, endpoint, method, entry)).status === 403, `non-Admin ${method} rejected`);
    check((await api(role, "/api/intake", "POST", reused)).status === 403, "non-Admin intake rejected");
  }
  for (const amount of ["-1", "1.001", "1e3", "10000000000", null]) check((await api(admin, endpoint, "POST", { ...entry, amount })).status === 400, `invalid amount ${amount} rejected`);
  check((await api(admin, endpoint, "POST", { ...entry, date: "2026-02-30" })).status === 400, "invalid calendar date rejected");
  check((await api(admin, endpoint, "POST", { ...entry, status: "overdue" })).status === 400, "invalid status rejected");
  response = await api(admin, endpoint, "POST", entry);
  check(response.status === 201, "Admin creates pending entry"); const entryId = response.data.id;
  response = await api(admin, endpoint, "PATCH", { ...entry, id: entryId, status: "paid", amount: "125.51" });
  check(response.status === 200 && Number(response.data.amount) === 125.51 && response.data.status === "paid", "Admin updates amount and marks paid");
  check((await api(admin, `/api/cases/${otherId}/ledger`, "PATCH", { ...entry, id: entryId })).status === 404, "entry cannot be changed through another case");
  check((await api(admin, `/api/cases/${otherId}/ledger`, "DELETE", { id: entryId })).status === 404, "entry cannot be deleted through another case");
  for (const role of [viewer, agent]) {
    const { data, error } = await role.client.from("ledger").select("id").eq("id", entryId); assert.ifError(error);
    check(data.length === 1, "authorized role reads case ledger through RLS");
    const denied = await role.client.from("ledger").insert({ ...entry, case_id: id });
    check(Boolean(denied.error), "direct Data API ledger insert blocked by RLS");
    const update = await role.client.from("ledger").update({ amount: 1 }).eq("id", entryId).select("id");
    check(!update.data?.length, "direct Data API ledger update blocked by RLS");
    const removal = await role.client.from("ledger").delete().eq("id", entryId).select("id");
    check(!removal.data?.length, "direct Data API ledger delete blocked by RLS");
  }
  check((await api(agent, `/cases/${otherId}`, "GET")).status === 404, "Agent cannot open unassigned case");
  check((await api(viewer, `/cases/${id}`, "GET")).status === 200, "Viewer can open case ledger");
  check((await api(agent, `/cases/${id}`, "GET")).status === 200, "Agent can open assigned case ledger");
  const page = await api(admin, `/cases/${id}`, "GET");
  check(page.status === 200 && page.data.includes("125.51"), "saved amount renders in case page");
  const forbidden = await agent.client.from("cases").update({ case_number: "FORBIDDEN" }).eq("id", id);
  check(Boolean(forbidden.error), "Agent core case edits remain blocked");
  const allowed = await agent.client.from("cases").update({ status: "Reviewed", assessment: "Verified" }).eq("id", id).select("id");
  check(allowed.data?.length === 1 && !allowed.error, "Agent status and assessment edits remain allowed");
  response = await api(admin, endpoint, "DELETE", { id: entryId }); check(response.status === 200, "Admin deletes ledger entry");
  const { error: removeError } = await admin.client.storage.from("case-images").remove([record.images[0].path]); assert.ifError(removeError);
  const { data: remaining } = await service.storage.from("case-images").list(id);
  check(!remaining?.length, "Admin image cleanup removes the stored file");
  console.log(`${checks} checks passed.`);
} finally {
  for (const id of cases) {
    const { data } = await service.storage.from("case-images").list(id);
    if (data?.length) assert.ifError((await service.storage.from("case-images").remove(data.map(file => `${id}/${file.name}`))).error);
    assert.ifError((await service.from("cases").delete().eq("id", id)).error);
  }
  for (const id of clients) assert.ifError((await service.from("clients").delete().eq("id", id)).error);
  for (const client of sessions) await client.auth.signOut();
  for (const id of users) assert.ifError((await service.auth.admin.deleteUser(id)).error);
  console.log("Temporary cases, clients, images, sessions, and users removed.");
}
