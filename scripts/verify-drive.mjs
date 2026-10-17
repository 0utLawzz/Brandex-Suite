// Historical verification for the pre-operations schema; preserved for reference.
throw new Error("Superseded: use verify-operations-db.mjs, verify-operations-live.mjs and verify-drive-identity.mjs. This historical script must not create legacy Agent fixtures in the current schema.");
// Hosted integration test. Creates only isolated fixtures; never logs credentials.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const project = "xogbpsnsmephupbqsfgb",
  url = `https://${project}.supabase.co`;
const keys = JSON.parse(
  execSync(
    `supabase projects api-keys --project-ref ${project} --output json`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const service = createClient(
  url,
  keys.find((k) => k.name === "service_role").api_key,
  { auth: { persistSession: false } },
);
const anon = keys.find((k) => k.name === "anon").api_key;
const users = [],
  sessions = [],
  run = crypto.randomUUID().slice(0, 8);
const testSeries = "T" + run.toUpperCase();
let clientId, caseId, googleToken, privateRoot;
const driveFolders = new Set();
let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log("PASS " + label);
};
async function staff(role) {
  const password = crypto.randomUUID() + "Aa1!";
  const { data, error } = await service.auth.admin.createUser({
    email: `drive-${run}-${role}@example.com`,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  users.push(data.user.id);
  assert.ifError(
    (await service.from("profiles").update({ role }).eq("id", data.user.id))
      .error,
  );
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const session = await client.auth.signInWithPassword({
    email: data.user.email,
    password,
  });
  assert.ifError(session.error);
  sessions.push(client);
  return {
    email: data.user.email,
    password,
    id: data.user.id,
    client,
    token: session.data.session.access_token,
  };
}
const pdf = new TextEncoder().encode(
  "%PDF-1.4\nBrandex isolated Drive integration test\n%%EOF",
);
async function call(
  who,
  {
    id = crypto.randomUUID(),
    bytes = pdf,
    type = "application/pdf",
    origin = "https://brandex-suite.vercel.app",
    target = caseId,
    series = testSeries,
  } = {},
) {
  const form = new FormData();
  form.set("case_id", target ?? crypto.randomUUID());
  form.set("upload_id", id);
  form.set("series", series);
  form.set("folder_name", `DRIVE-TEST-${run}`);
  form.set("file", new Blob([bytes], { type }), "verification.pdf");
  const r = await fetch(`${url}/functions/v1/suite-drive-upload`, {
    method: "POST",
    headers: {
      apikey: anon,
      ...(who ? { Authorization: `Bearer ${who.token}` } : {}),
      Origin: origin,
    },
    body: form,
  });
  return { status: r.status, data: await r.json() };
}
async function drive(path, init = {}) {
  const r = await fetch("https://www.googleapis.com/drive/v3/" + path, {
    ...init,
    headers: { Authorization: `Bearer ${googleToken}`, ...init.headers },
  });
  if (!r.ok) throw new Error("Test Drive operation failed: " + r.status);
  return r.status === 204 ? null : await r.json();
}
try {
  const creds = JSON.parse(
    readFileSync(
      process.env.BRANDEX_DRIVE_CREDENTIAL_FILE ??
        "G:/Brandex Workspace/private-config/google-drive-credentials.json",
      "utf8",
    ),
  );
  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tj = await tr.json();
  assert.ok(tr.ok && tj.access_token, "Test Google access");
  googleToken = tj.access_token;
  const admin = await staff("admin"),
    viewer = await staff("viewer"),
    agent = await staff("agent");
  let r = await service
    .from("clients")
    .insert({
      client_code: `X-DRIVETEST-${run}`,
      trading_as: `Suite upload test ${run}`,
      address: "Isolated test fixture",
    })
    .select("id")
    .single();
  assert.ifError(r.error);
  clientId = r.data.id;
  r = await service
    .from("cases")
    .insert({
      client_id: clientId,
      case_prefix: "DRIVETEST",
      case_number: run,
      origin: "fresh",
    })
    .select("id")
    .single();
  assert.ifError(r.error);
  caseId = r.data.id;
  check((await call(null)).status === 401, "anonymous upload denied");
  check((await call(viewer)).status === 403, "Viewer upload denied");
  check((await call(agent)).status === 403, "legacy Agent upload denied");
  check(
    (await call(admin, { origin: "https://untrusted.example" })).status === 403,
    "unapproved browser origin denied",
  );
  check(
    (
      await call(admin, {
        bytes: new TextEncoder().encode("wrong file content"),
      })
    ).status === 400,
    "disguised file rejected",
  );
  check(
    (await call(admin, { target: crypto.randomUUID() })).status === 404,
    "missing case rejected",
  );
  check(
    Boolean(
      (
        await viewer.client.rpc("claim_suite_drive", {
          p_client: clientId,
          p_operation: crypto.randomUUID(),
        })
      ).error,
    ),
    "Viewer cannot obtain upload lease",
  );
  check(
    Boolean(
      (
        await viewer.client.from("drive_series").insert({
          code: `T${run.toUpperCase()}`,
          root_folder_id: "fakefolder12345",
        })
      ).error,
    ),
    "Viewer direct table write denied",
  );
  const defaultRoot = await service
    .from("drive_series")
    .select("root_folder_id")
    .eq("code", "X")
    .single();
  assert.ifError(defaultRoot.error);
  const defaultPermissions = await drive(
    `files/${defaultRoot.data.root_folder_id}/permissions?fields=permissions(type)`,
  );
  if (
    defaultPermissions.permissions.some(
      (p) => p.type === "anyone" || p.type === "domain",
    )
  ) {
    check(
      (await call(admin, { series: "X" })).status === 409,
      "publicly shared default root blocked before upload",
    );
  }
  privateRoot = (
    await drive("files?fields=id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `BRANDEX-PRIVATE-TEST-${run}`,
        mimeType: "application/vnd.google-apps.folder",
      }),
    })
  ).id;
  driveFolders.add(privateRoot);
  assert.ifError(
    (
      await service
        .from("drive_series")
        .insert({ code: testSeries, root_folder_id: privateRoot })
    ).error,
  );
  const id = crypto.randomUUID(),
    first = await call(admin, { id });
  if (first.status !== 200)
    throw new Error(
      `Upload test failed (${first.status}): ${first.data.error ?? first.data.message ?? "unknown"}`,
    );
  driveFolders.add(first.data.folder_id);
  check(Boolean(first.data.file_id), "Admin uploaded real file to Drive");
  const bindings = await service
    .from("drive_clients")
    .select("folder_id")
    .eq("client_id", clientId)
    .single();
  assert.ifError(bindings.error);
  driveFolders.add(bindings.data.folder_id);
  const content = await fetch(
    `https://www.googleapis.com/drive/v3/files/${first.data.file_id}?alt=media`,
    { headers: { Authorization: `Bearer ${googleToken}` } },
  );
  check(
    content.ok && (await content.text()) === new TextDecoder().decode(pdf),
    "uploaded bytes retrieved correctly",
  );
  const permissions = await drive(
    `files/${first.data.file_id}/permissions?fields=permissions(type,role)`,
  );
  check(
    !permissions.permissions.some((p) => p.type === "anyone"),
    "upload is not publicly shared",
  );
  const retry = await call(admin, { id });
  check(
    retry.status === 200 &&
      retry.data.file_id === first.data.file_id &&
      retry.data.replayed,
    "same upload retry returns same file",
  );
  check(
    (
      await call(admin, {
        id,
        bytes: new TextEncoder().encode("%PDF-1.4 different"),
      })
    ).status === 409,
    "same upload ID cannot replace contents",
  );
  const second = await call(admin);
  check(
    second.status === 200 && second.data.folder_id === first.data.folder_id,
    "second file reuses same case folder",
  );
  const history = await viewer.client
    .from("drive_files")
    .select("file_id")
    .eq("case_id", caseId);
  assert.ifError(history.error);
  check(
    history.data.length === 2,
    "Viewer can read case file history without duplicate retry row",
  );
  check(
    (
      await agent.client
        .from("drive_files")
        .select("file_id")
        .eq("case_id", caseId)
    ).data?.length === 0,
    "legacy Agent cannot read Drive history",
  );
  const lease = crypto.randomUUID();
  assert.equal(
    (
      await admin.client.rpc("claim_suite_drive", {
        p_client: clientId,
        p_operation: lease,
      })
    ).data,
    true,
  );
  check(
    (await call(admin)).status === 409,
    "concurrent client upload lease blocks duplicates",
  );
  assert.ifError(
    (
      await admin.client.rpc("release_suite_drive", {
        p_client: clientId,
        p_operation: lease,
      })
    ).error,
  );
  if (process.env.BRANDEX_VERIFY_BROWSER === "1") {
    const require = createRequire(import.meta.url);
    const {
      chromium,
    } = require("C:/Users/NADEEM/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
    const browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.BRANDEX_BROWSER_EXECUTABLE ??
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
    });
    try {
      mkdirSync("work/drive-verification", { recursive: true });
      for (const role of [admin, viewer]) {
        const context = await browser.newContext({
            viewport: { width: 1360, height: 1000 },
          }),
          page = await context.newPage();
        const faults = [];
        page.on("pageerror", (e) => faults.push(e.message));
        await page.goto(
          (process.env.BRANDEX_TEST_BASE_URL ??
            "https://brandex-suite.vercel.app") + "/login",
        );
        await page.getByLabel("EMAIL", { exact: true }).fill(role.email);
        await page.getByLabel("PASSWORD", { exact: true }).fill(role.password);
        await page
          .getByRole("button", { name: "SIGN IN", exact: true })
          .click();
        await page.waitForURL("**/dashboard");
        await page.goto(
          (process.env.BRANDEX_TEST_BASE_URL ??
            "https://brandex-suite.vercel.app") + `/cases/${caseId}`,
        );
        await page
          .getByRole("heading", { name: "Google Drive", exact: true })
          .waitFor();
        await page
          .getByText("Loading Drive records�")
          .waitFor({ state: "hidden" });
        if (role === admin) {
          await page.locator("#drive-file").setInputFiles({
            name: "verification-ui.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from(pdf),
          });
          await page
            .getByRole("button", { name: "UPLOAD TO DRIVE", exact: true })
            .click();
          await page
            .getByText("Uploaded to the private case folder.", { exact: true })
            .waitFor({ timeout: 120000 });
          await page
            .getByRole("link", { name: "verification-ui.pdf", exact: true })
            .waitFor({ timeout: 30000 });
          check(
            (await page
              .getByRole("link", { name: "verification-ui.pdf", exact: true })
              .count()) === 1,
            "browser Admin upload updates file history",
          );
        } else {
          check(
            (await page
              .getByRole("button", { name: "UPLOAD TO DRIVE", exact: true })
              .count()) === 0,
            "browser Viewer has no upload controls",
          );
          try {
            await page
              .getByRole("link", { name: "verification-ui.pdf", exact: true })
              .waitFor({ timeout: 30000 });
          } catch (e) {
            await page.screenshot({
              path: "work/drive-verification/viewer-failure.png",
              fullPage: true,
            });
            console.log(
              "Viewer history state: " +
                (await page.locator('[role="alert"]').allTextContents()),
            );
            throw e;
          }
          check(
            (await page
              .getByRole("link", { name: "verification-ui.pdf", exact: true })
              .count()) === 1,
            "browser Viewer sees uploaded history",
          );
        }
        check(
          faults.length === 0,
          "browser case page has no uncaught JavaScript errors",
        );
        await page.screenshot({
          path: `work/drive-verification/${role === admin ? "admin" : "viewer"}.png`,
          fullPage: true,
        });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  console.log(`${checks} hosted Drive checks passed.`);
} finally {
  // Recover folder bindings even when a partial upload failed, then trash only this fixture's folders.
  if (caseId) {
    const c = await service
      .from("drive_cases")
      .select("folder_id")
      .eq("case_id", caseId)
      .maybeSingle();
    if (c.data) driveFolders.add(c.data.folder_id);
  }
  if (clientId) {
    const c = await service
      .from("drive_clients")
      .select("folder_id")
      .eq("client_id", clientId)
      .maybeSingle();
    if (c.data) driveFolders.add(c.data.folder_id);
  }
  let failures = 0;
  for (const id of driveFolders) {
    try {
      await drive(`files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      });
    } catch {
      failures++;
    }
  }
  if (caseId) {
    for (const table of ["drive_files", "drive_cases"]) {
      const r = await service.from(table).delete().eq("case_id", caseId);
      if (r.error) failures++;
    }
    if ((await service.from("cases").delete().eq("id", caseId)).error)
      failures++;
  }
  if (clientId) {
    if (
      (await service.from("drive_clients").delete().eq("client_id", clientId))
        .error
    )
      failures++;
    if ((await service.from("clients").delete().eq("id", clientId)).error)
      failures++;
  }
  if (
    (await service.from("drive_series").delete().eq("code", testSeries)).error
  )
    failures++;
  for (const client of sessions) await client.auth.signOut();
  for (const id of users) {
    if ((await service.auth.admin.deleteUser(id)).error) failures++;
  }
  if (failures)
    throw new Error(`${failures} fixture cleanup operations need review`);
  console.log(
    "Isolated test data/users removed; created Drive test folders trashed.",
  );
}
