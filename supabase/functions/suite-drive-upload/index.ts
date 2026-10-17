import { createClient } from "npm:@supabase/supabase-js@2.58.0";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const folderId = /^[A-Za-z0-9_-]{10,200}$/;
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
class SafeError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("BRANDEX_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim());
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin))
    headers["Access-Control-Allow-Origin"] = origin;
  headers["Access-Control-Allow-Headers"] =
    "authorization, apikey, content-type, x-client-info";
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  if (origin && !allowed.includes(origin))
    return reply({ error: "Origin denied" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
      auth: { persistSession: false },
    },
  );
  let clientId = "",
    claimed = false;
  const operation = crypto.randomUUID();
  try {
    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();
    if (authError || !user)
      return reply({ error: "Authentication required" }, 401);
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin")
      return reply({ error: "Admin access required" }, 403);
    if (Number(req.headers.get("content-length") ?? 0) > 21 * 1024 * 1024)
      return reply({ error: "File too large" }, 413);
    const form = await req.formData(),
      caseId = String(form.get("case_id") ?? ""),
      uploadId = String(form.get("upload_id") ?? "");
    const file = form.get("file");
    if (
      !uuid.test(caseId) ||
      !uuid.test(uploadId) ||
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 20 * 1024 * 1024 ||
      !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
    )
      return reply({ error: "Choose PDF, PNG or JPEG, up to 20 MB" }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf =
      bytes[0] === 37 &&
      bytes[1] === 80 &&
      bytes[2] === 68 &&
      bytes[3] === 70 &&
      bytes[4] === 45;
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
      (b, i) => bytes[i] === b,
    );
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (
      !(file.type === "application/pdf"
        ? pdf
        : file.type === "image/png"
          ? png
          : jpg)
    )
      return reply({ error: "File contents do not match its type" }, 400);
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const name =
      file.name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 180) || "upload";
    const must = (error: unknown) => {
      if (error)
        throw new SafeError(
          "Could not save or read case upload data. Retry the same file.",
          500,
        );
    };
    const { data: record, error: ce } = await sb
      .from("cases")
      .select("id,client_id,case_number")
      .eq("id", caseId)
      .maybeSingle();
    must(ce);
    if (!record) return reply({ error: "Case not found" }, 404);
    clientId = record.client_id;
    const { data: won, error: le } = await sb.rpc("claim_suite_drive", {
      p_client: clientId,
      p_operation: operation,
    });
    must(le);
    if (!won)
      return reply(
        { error: "Another upload for this client is active. Retry shortly." },
        409,
      );
    claimed = true;
    const { data: old, error: oe } = await sb
      .from("drive_files")
      .select("*")
      .eq("upload_id", uploadId)
      .maybeSingle();
    must(oe);
    if (old) {
      if (
        old.case_id !== caseId ||
        old.sha256 !== hash ||
        old.file_name !== name
      )
        throw new SafeError("Upload ID already belongs to a different file");
      return reply({ file_id: old.file_id, replayed: true });
    }
    const { data: client, error: cle } = await sb
      .from("clients")
      .select("client_code,trading_as")
      .eq("id", clientId)
      .single();
    must(cle);
    if (!client) throw new SafeError("Client not found", 404);
    const { data: binding, error: be } = await sb
      .from("drive_clients")
      .select("series,folder_id")
      .eq("client_id", clientId)
      .maybeSingle();
    must(be);
    const series =
      binding?.series ??
      String(form.get("series") ?? "")
        .trim()
        .toUpperCase();
    const { data: root, error: re } = await sb
      .from("drive_series")
      .select("root_folder_id")
      .eq("code", series)
      .maybeSingle();
    must(re);
    if (!root) throw new SafeError("Configure this series' Drive root first");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET"),
      refresh = Deno.env.get("GOOGLE_REFRESH_TOKEN"),
      googleId = Deno.env.get("GOOGLE_CLIENT_ID");
    if (!clientSecret || !refresh || !googleId)
      throw new SafeError("Drive server connection is not configured", 503);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: googleId,
        client_secret: clientSecret,
        refresh_token: refresh,
      }),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token)
      throw new SafeError("Google authorization needs renewal", 503);
    async function drive(path: string, init: RequestInit = {}) {
      const res = await fetch("https://www.googleapis.com/drive/v3/" + path, {
        ...init,
        signal: AbortSignal.timeout(60000),
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          ...init.headers,
        },
      });
      if (!res.ok) {
        const operation = path.includes("/permissions") ? "permission check" : init.method === "POST" ? "folder creation" : path.startsWith("files?") ? "folder search" : "folder check";
        console.error("Drive operation failed", { operation, status: res.status });
        throw new SafeError(`Google Drive ${operation} failed (${res.status}). Check folder access and retry.`,502);
      }
      return await res.json();
    }
    async function assertPrivate(id: string) {
      const permissions = await drive(
        `files/${encodeURIComponent(id)}/permissions?fields=permissions(type),nextPageToken&pageSize=100`,
      );
      if (
        permissions.nextPageToken ||
        permissions.permissions?.some(
          (p: { type: string }) => p.type === "anyone" || p.type === "domain",
        )
      )
        throw new SafeError(
          "Destination inherits public/domain sharing. Choose a restricted Drive root or ask its owner to restrict access before uploading.",
        );
    }
    await assertPrivate(root.root_folder_id);
    async function folder(parent: string, label: string, saved: string) {
      if (saved) {
        if (!folderId.test(saved))
          throw new SafeError("Invalid folder ID", 400);
        const f = await drive(
          `files/${encodeURIComponent(saved)}?fields=id,mimeType,trashed,parents`,
        );
        if (
          f.trashed ||
          f.mimeType !== "application/vnd.google-apps.folder" ||
          !f.parents?.includes(parent)
        )
          throw new SafeError(
            "Existing folder is outside the selected parent. Reconcile its ID.",
          );
        await assertPrivate(f.id);
        return f.id;
      }
      const q = `'${esc(parent)}' in parents and name='${esc(label)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const result = await drive(
        `files?q=${encodeURIComponent(q)}&fields=files(id),nextPageToken&pageSize=100`,
      );
      if (result.files.length > 1 || result.nextPageToken)
        throw new SafeError(
          "Duplicate folder names: supply the verified existing folder ID",
        );
      if (result.files.length === 1) {
        await assertPrivate(result.files[0].id);
        return result.files[0].id;
      }
      return (
        await drive("files?fields=id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: label,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parent],
          }),
        })
      ).id;
    }
    const clientFolder = await folder(
      root.root_folder_id,
      `${client.client_code} ${client.trading_as}`.slice(0, 200),
      binding?.folder_id ?? String(form.get("client_folder_id") ?? "").trim(),
    );
    if (!binding) {
      const { error } = await sb
        .from("drive_clients")
        .insert({ client_id: clientId, series, folder_id: clientFolder });
      must(error);
    }
    const { data: caseBinding, error: cbe } = await sb
      .from("drive_cases")
      .select("folder_id")
      .eq("case_id", caseId)
      .maybeSingle();
    must(cbe);
    const label = String(form.get("folder_name") ?? "").trim();
    if (
      !caseBinding &&
      (!label || label.length > 200 || /[\x00-\x1f]/.test(label))
    )
      throw new SafeError("Enter a case folder name up to 200 characters", 400);
    const caseFolder = await folder(
      clientFolder,
      label,
      caseBinding?.folder_id ?? String(form.get("case_folder_id") ?? "").trim(),
    );
    if (!caseBinding) {
      const { error } = await sb
        .from("drive_cases")
        .insert({ case_id: caseId, folder_id: caseFolder });
      must(error);
    }
    const q = `'${esc(caseFolder)}' in parents and appProperties has { key='brandexSuiteUpload' and value='${uploadId}' } and trashed=false`;
    const existing = await drive(
      `files?q=${encodeURIComponent(q)}&fields=files(id,name,appProperties),nextPageToken&pageSize=100`,
    );
    if (existing.files.length > 1 || existing.nextPageToken)
      throw new SafeError("Duplicate upload identity needs reconciliation");
    let fileId = existing.files[0]?.id;
    if (
      fileId &&
      (existing.files[0].appProperties?.sha256 !== hash ||
        existing.files[0].name !== name)
    )
      throw new SafeError("Retry file differs from original upload");
    if (!fileId) {
      const start = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
        {
          method: "POST",
          signal: AbortSignal.timeout(30000),
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": file.type,
            "X-Upload-Content-Length": String(file.size),
          },
          body: JSON.stringify({
            name,
            parents: [caseFolder],
            appProperties: { brandexSuiteUpload: uploadId, sha256: hash },
          }),
        },
      );
      const location = start.headers.get("location");
      if (
        !start.ok ||
        !location?.startsWith("https://www.googleapis.com/upload/")
      )
        throw new SafeError("Could not start upload; retry the same file", 502);
      const uploaded = await fetch(location, {
        method: "PUT",
        signal: AbortSignal.timeout(90000),
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": file.type,
        },
        body: bytes,
      });
      if (!uploaded.ok)
        throw new SafeError("Upload interrupted; retry the same file", 502);
      fileId = (await uploaded.json()).id;
    }
    const { error: saveError } = await sb
      .from("drive_files")
      .insert({
        upload_id: uploadId,
        case_id: caseId,
        file_id: fileId,
        file_name: name,
        mime_type: file.type,
        byte_size: file.size,
        sha256: hash,
        uploaded_by: user.id,
      });
    must(saveError);
    return reply({ file_id: fileId, folder_id: caseFolder });
  } catch (e) {
    return reply(
      {
        error:
          e instanceof SafeError
            ? e.message
            : "Upload could not finish. Retry the same file.",
      },
      e instanceof SafeError ? e.status : 500,
    );
  } finally {
    if (claimed)
      await sb.rpc("release_suite_drive", {
        p_client: clientId,
        p_operation: operation,
      });
  }
});
