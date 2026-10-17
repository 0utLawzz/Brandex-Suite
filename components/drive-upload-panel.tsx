"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type DriveFile = {
  upload_id: string;
  file_id: string;
  file_name: string;
  created_at: string;
  byte_size: number;
};
type Root = { code: string; root_folder_id: string };
export default function DriveUploadPanel({
  caseId,
  clientId,
  clientCode,
  caseNumber,
  canWrite,
  defaultFolderName,
}: {
  caseId: string;
  clientId: string;
  clientCode: string;
  caseNumber: string;
  canWrite: boolean;
  defaultFolderName?: string;
}) {
  const [sb] = useState(() => createClient());
  const [roots, setRoots] = useState<Root[]>([]),
    [files, setFiles] = useState<DriveFile[]>([]),
    [series, setSeries] = useState(clientCode.match(/^([A-Z]+)-/)?.[1] ?? "");
  const [clientFolder, setClientFolder] = useState(""),
    [caseFolder, setCaseFolder] = useState(""),
    [folderName, setFolderName] = useState(defaultFolderName??`${clientCode}-${caseNumber}`);
  const [bound, setBound] = useState(false),
    [clientBound, setClientBound] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [uploadId, setUploadId] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [more, setMore] = useState(false);
  const [newSeries, setNewSeries] = useState(""),
    [newRoot, setNewRoot] = useState("");
  const load = useCallback(async () => {
    const [rs, cs, cc, fs] = await Promise.all([
      sb.from("drive_series").select("code,root_folder_id").order("code"),
      sb
        .from("drive_clients")
        .select("series,folder_id")
        .eq("client_id", clientId)
        .maybeSingle(),
      sb
        .from("drive_cases")
        .select("folder_id")
        .eq("case_id", caseId)
        .maybeSingle(),
      sb
        .from("drive_files")
        .select("upload_id,file_id,file_name,created_at,byte_size")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .order("upload_id")
        .range(0, 49),
    ]);
    if ([rs, cs, cc, fs].some((r) => r.error))
      throw new Error("Could not load Drive records. Please retry.");
    setRoots(rs.data ?? []);
    setFiles(fs.data ?? []);
    setMore(fs.data?.length === 50);
    if (cs.data) {
      setSeries(cs.data.series);
      setClientFolder(cs.data.folder_id);
      setClientBound(true);
    }
    if (cc.data) {
      setCaseFolder(cc.data.folder_id);
      setBound(true);
    }
  }, [sb, caseId, clientId]);
  useEffect(() => {
    let active = true;
    load()
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const formElement = e.currentTarget as HTMLFormElement;
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("case_id", caseId);
      body.set("upload_id", uploadId);
      body.set("file", file);
      body.set("series", series);
      body.set("folder_name", folderName);
      body.set("client_folder_id", clientFolder);
      body.set("case_folder_id", caseFolder);
      const { data, error: err } = await sb.functions.invoke(
        "suite-drive-upload",
        { body },
      );
      if (err) {
        let text = "Upload failed. Retry the same file.";
        try {
          text = (await err.context.json()).error ?? text;
        } catch {}
        throw new Error(text);
      }
      if (data?.error) throw new Error(data.error);
      setMessage("Uploaded to the private case folder.");
      setFile(null);
      setUploadId("");
      formElement.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function addSeries(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const code = newSeries.trim().toUpperCase(),
        root = newRoot.trim();
      if (
        !/^[A-Z][A-Z0-9]{0,11}$/.test(code) ||
        !/^[A-Za-z0-9_-]{10,200}$/.test(root)
      )
        throw new Error("Enter a series code and valid Drive folder ID.");
      const { error } = await sb
        .from("drive_series")
        .insert({ code, root_folder_id: root });
      if (error)
        throw new Error("Could not add series. Check for an existing code.");
      await load();
      setSeries(code);
      setNewSeries("");
      setNewRoot("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add series.");
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    setBusy(true);
    try {
      const { data, error } = await sb
        .from("drive_files")
        .select("upload_id,file_id,file_name,created_at,byte_size")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .order("upload_id")
        .range(files.length, files.length + 49);
      if (error) throw error;
      setFiles((prev) => [...prev, ...data]);
      setMore(data.length === 50);
    } catch {
      setError("Could not load more files.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <p className="section-label">CASE FILES</p>
      <h2>Google Drive</h2>
      <p className="muted">
        Upload from your computer or phone. Files stay private in the linked
        client and case folders. Opening files requires access with your Google
        account.
      </p>
      {loading ? (
        <p role="status">Loading Drive records…</p>
      ) : (
        <>
          {canWrite && (
            <>
              <form onSubmit={upload}>
                <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="drive-series">Client series</label>
                      <select
                        id="drive-series"
                        className="nb-input"
                        value={series}
                        disabled={clientBound}
                        required
                        onChange={(e) => setSeries(e.target.value)}
                      >
                        <option value="">Choose series</option>
                        {roots.map((r) => (
                          <option key={r.code}>{r.code}</option>
                        ))}
                      </select>
                    </div>
                    {!bound && (
                      <div className="field">
                        <label htmlFor="drive-name">Case folder name</label>
                        <Input
                          id="drive-name"
                          value={folderName}
                          maxLength={200}
                          required
                          onChange={(e) => setFolderName(e.target.value)}
                        />
                        <small>
                          Use the existing exact name, or enter mark, TM and
                          class as needed.
                        </small>
                      </div>
                    )}
                    {!clientBound && (
                      <div className="field">
                        <label htmlFor="drive-client-folder">
                          Existing client folder ID (optional)
                        </label>
                        <Input
                          id="drive-client-folder"
                          value={clientFolder}
                          onChange={(e) => setClientFolder(e.target.value)}
                        />
                      </div>
                    )}
                    {!bound && (
                      <div className="field">
                        <label htmlFor="drive-case-folder">
                          Existing case folder ID (optional)
                        </label>
                        <Input
                          id="drive-case-folder"
                          value={caseFolder}
                          onChange={(e) => setCaseFolder(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="field full">
                      <label htmlFor="drive-file">
                        PDF, PNG or JPEG · up to 20 MB
                      </label>
                      <Input
                        id="drive-file"
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        required
                        onChange={(e) => {
                          setFile(e.target.files?.[0] ?? null);
                          setUploadId(crypto.randomUUID());
                        }}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={busy || !file}>
                    {busy ? "UPLOADING…" : "UPLOAD TO DRIVE"}
                  </Button>
                </fieldset>
              </form>
              {!clientBound && (
                <details>
                  <summary>Add a series and Drive root</summary>
                  <form onSubmit={addSeries}>
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="drive-new-series">Series</label>
                        <Input
                          id="drive-new-series"
                          value={newSeries}
                          onChange={(e) => setNewSeries(e.target.value)}
                          required
                          maxLength={12}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="drive-new-root">Root folder ID</label>
                        <Input
                          id="drive-new-root"
                          value={newRoot}
                          onChange={(e) => setNewRoot(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={busy}>
                      ADD SERIES
                    </Button>
                  </form>
                </details>
              )}
            </>
          )}
          {caseFolder && (
            <p>
              <a
                className="nb-button"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://drive.google.com/drive/folders/${encodeURIComponent(caseFolder)}`}
              >
                OPEN CASE FOLDER
              </a>
            </p>
          )}
          {files.length ? (
            <ul>
              {files.map((f) => (
                <li key={f.upload_id}>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://drive.google.com/file/d/${encodeURIComponent(f.file_id)}/view`}
                  >
                    {f.file_name}
                  </a>{" "}
                  · {new Date(f.created_at).toLocaleDateString()} ·{" "}
                  {Math.ceil(f.byte_size / 1024)} KB
                </li>
              ))}
            </ul>
          ) : (
            <p>No files uploaded through Suite yet.</p>
          )}
          {more && (
            <Button disabled={busy} onClick={loadMore}>
              LOAD MORE FILES
            </Button>
          )}
        </>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
          >
            Reload records
          </button>
        </p>
      )}
    </section>
  );
}
