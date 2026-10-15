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
  let data; try { data = JSON.parse(text); } catch { data = text.replace(/<!--.*?-->/gs, ""); }
  return { status: response.status, data, location: response.headers.get("location") };
}
async function staff(role, label = role) {
  const email = `brandex-${run}-${label}@example.com`;
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
  const admin = await staff("admin"), viewer = await staff("viewer"), agent = await staff("agent"), other = await staff("agent", "other");
  const { data: client, error: ce } = await service.from("clients").insert({ client_code: `P5-${run}`, trading_as: `Phase five ${run}`, address: "Test address" }).select("id").single(); assert.ifError(ce); clients.push(client.id);
  for (const [suffix, assigned] of [["A", agent.id], ["B", other.id], ["C", null]]) {
    const { data, error } = await service.from("cases").insert({ client_id: client.id, case_prefix: "P5", case_number: run + suffix, origin: "fresh", assigned_agent_id: assigned }).select("id").single(); assert.ifError(error); cases.push(data.id);
  }
  const [id, otherId, emptyId] = cases;
  assert.ifError((await service.from("ledger").insert([{ case_id: id, amount: "123.45", type: "Test", status: "paid" }, { case_id: otherId, amount: "987.65", type: "Test", status: "pending" }])).error);
  const version = async target => { const { data, error } = await service.from("cases").select("updated_at").eq("id", target).single(); assert.ifError(error); return data.updated_at; };
  const workflow = `/api/cases/${id}/workflow`, assignment = `/api/cases/${id}/assignment`;
  const payload = { status: "Reviewed", assessment: "Ready for Admin review", expected_updated_at: await version(id) };
  check((await api(null, "/dashboard", "GET")).location?.includes("/login"), "dashboard requires authentication");
  check((await api(null, workflow, "PATCH", payload)).status === 401, "anonymous workflow denied");
  check((await api(null, assignment, "PATCH", {})).status === 401, "anonymous assignment denied");
  check((await api(viewer, workflow, "PATCH", payload)).status === 403, "Viewer cannot update assessments");
  for (const role of [viewer, agent]) check((await api(role, assignment, "PATCH", {})).status === 403, "non-Admin cannot assign cases");
  check((await api(other, workflow, "PATCH", payload)).status === 404, "other Agent cannot update inaccessible case");
  check((await api(agent, workflow, "PATCH", { ...payload, stage: "Illegal" })).status === 400, "workflow rejects core fields");
  check((await api(agent, workflow, "PATCH", { ...payload, status: " " })).status === 400, "workflow rejects blank status");
  check((await api(agent, workflow, "PATCH", payload)).status === 200, "assigned Agent saves status and assessment");
  check((await api(agent, workflow, "PATCH", payload)).status === 409, "stale edits cannot overwrite changes");
  for (const change of [{ case_number: "Forbidden" }, { created_at: "2000-01-01T00:00:00Z" }, { id: crypto.randomUUID() }, { assigned_agent_id: other.id }]) {
    check(Boolean((await agent.client.from("cases").update(change).eq("id", id)).error), "direct API protects core case fields");
  }
  for (const role of [admin, viewer, agent]) {
    const response = await api(role, "/dashboard", "GET");
    check(response.status === 200 && response.data.includes(`P5-${run}A`), "role dashboard includes accessible case");
    check(role === agent ? !response.data.includes(`P5-${run}B`) : response.data.includes(`P5-${run}B`), "dashboard respects role scope");
    if (role === agent) check(response.data.includes("123.45") && !response.data.includes("987.65"), "Agent dashboard payments are scoped");
  }
  let response = await api(admin, `/cases?q=${run}&assignment=unassigned`, "GET");
  check(response.status === 200 && response.data.includes(`P5-${run}C`) && !response.data.includes(`P5-${run}A`), "assignment filter shows only matching cases");
  response = await api(viewer, `/cases?q=${run}&status=Reviewed`, "GET");
  check(response.status === 200 && response.data.includes(`P5-${run}A`) && !response.data.includes(`P5-${run}B`), "status and search filters combine");
  check((await api(admin, assignment, "PATCH", { assigned_agent_id: viewer.id, expected_updated_at: await version(id) })).status === 400, "Viewer cannot be selected as Agent");
  const before = await version(id);
  check((await api(admin, assignment, "PATCH", { assigned_agent_id: other.id, expected_updated_at: before })).status === 200, "Admin reassigns case");
  check((await api(admin, assignment, "PATCH", { assigned_agent_id: null, expected_updated_at: before })).status === 409, "stale assignment rejected");
  check((await api(agent, `/cases/${id}`, "GET")).status === 404, "previous Agent immediately loses case access");
  check((await api(other, `/cases/${id}`, "GET")).status === 200, "new Agent gains case access");
  check((await api(admin, assignment, "PATCH", { assigned_agent_id: null, expected_updated_at: await version(id) })).status === 200, "Admin unassigns case");
  check((await api(other, `/cases/${id}`, "GET")).status === 404, "unassigning removes Agent access");
  check((await api(admin, assignment, "PATCH", { assigned_agent_id: agent.id, expected_updated_at: await version(id) })).status === 200, "Admin assigns case again");
  assert.ifError((await service.from("profiles").update({ role: "viewer" }).eq("id", agent.id)).error);
  const denied = await agent.client.from("cases").update({ status: "Forbidden" }).eq("id", id).select("id");
  check(!denied.data?.length, "demoted Agent has no direct write access despite old assignment");
  const { data: profile } = await admin.client.from("profiles").select("email").eq("id", other.id).single();
  check(profile.email.includes(run), "Admin roster has synced account emails");
  console.log(`${checks} checks passed.`);
} finally {
  for (const id of cases) assert.ifError((await service.from("cases").delete().eq("id", id)).error);
  for (const id of clients) assert.ifError((await service.from("clients").delete().eq("id", id)).error);
  for (const client of sessions) await client.auth.signOut();
  for (const id of users) assert.ifError((await service.auth.admin.deleteUser(id)).error);
  console.log("Temporary Phase 5 fixtures and users removed.");
}
