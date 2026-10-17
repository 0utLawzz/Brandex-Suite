"use client";
import { useRef, useState } from "react";
import "./demo.css";
type Case = {
  id: string;
  client: string;
  mark: string;
  stage: string;
  flag: string;
  billed: number;
  paid: number;
  next: string;
  origin?: string;
};
const seed: Case[] = [
  {
    id: "X-254-002",
    client: "Northstar Foods",
    mark: "NORTHSTAR",
    stage: "Examination",
    flag: "Overdue",
    billed: 45000,
    paid: 30000,
    next: "Record examination response",
  },
  {
    id: "A-108-001",
    client: "Atlas Textiles",
    mark: "ATLAS WEAVE",
    stage: "Filing",
    flag: "Review",
    billed: 25000,
    paid: 25000,
    next: "Review filing documents",
  },
  {
    id: "X-182-003",
    client: "Cedar & Co.",
    mark: "CEDAR",
    stage: "Acknowledgment",
    flag: "On track",
    billed: 35000,
    paid: 20000,
    next: "Record acknowledgment",
  },
  {
    id: "N-042-001",
    client: "Orbit Technologies",
    mark: "ORBIT",
    stage: "Opposition",
    flag: "Overdue",
    billed: 60000,
    paid: 35000,
    next: "Review opposition correspondence",
  },
  {
    id: "A-221-002",
    client: "Mehran Trading",
    mark: "MEHRAN",
    stage: "Accepted",
    flag: "Review",
    billed: 50000,
    paid: 30000,
    next: "Review Stage 3 charge",
  },
  {
    id: "X-096-004",
    client: "Greenfield Organics",
    mark: "GREENFIELD",
    stage: "Certificate",
    flag: "On track",
    billed: 40000,
    paid: 40000,
    next: "Confirm certificate delivery",
  },
];
const money = (n: number) => n.toLocaleString("en-PK");
export default function Demo() {
  const [cases, setCases] = useState(seed),
    [tab, setTab] = useState("Overview"),
    [filter, setFilter] = useState("All cases"),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<Case | null>(null),
    [creating, setCreating] = useState(false),
    [notice, setNotice] = useState(""),
    [document, setDocument] = useState(false),
    [role, setRole] = useState("Admin"),
    [reportTheme, setReportTheme] = useState<"purple" | "ink">("purple");
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = cases.filter(
    (c) =>
      (filter === "All cases" ||
        c.flag === filter ||
        (filter === "Outstanding" && c.billed > c.paid)) &&
      `${c.id} ${c.client} ${c.mark}`.toLowerCase().includes(q.toLowerCase()),
  );
  const billed = cases.reduce((a, c) => a + c.billed, 0),
    paid = cases.reduce((a, c) => a + c.paid, 0);
  function open(c: Case) {
    setSelected(c);
    setCreating(false);
    setDocument(false);
    dialog.current?.showModal();
  }
  function exportCsv() {
    const data = [
      ["Case", "Client", "Stage", "Billed", "Allocated", "Outstanding"],
      ...visible.map((c) => [
        c.id,
        c.client,
        c.stage,
        c.billed,
        c.paid,
        c.billed - c.paid,
      ]),
    ]
      .map((r) =>
        r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "brandex-demo.csv";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Sample data exported.");
  }
  return (
    <div className="bx-demo">
      <header className="bx-nav">
        <a href="/dashboard-demo" className="bx-logo">
          <img src="/brand/brandex-wordmark-navbar.png" alt="Brandex" />
          <small>SUITE</small>
        </a>
        <nav aria-label="Demo navigation">
          {[
            "Overview",
            "Cases",
            "Client ledger",
            "Reports",
            "Documents",
            "Associates",
          ].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setFilter("All cases");
                setQ("");
              }}
              key={t}
            >
              {t}
            </button>
          ))}
        </nav>
        <label className="bx-role">
          <span>DEMO ROLE</span>
          <select
            aria-label="Demo role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>Admin</option>
            <option>Viewer</option>
          </select>
        </label>
      </header>
      <div className="bx-demo-strip">
        <span>INTERACTIVE DESIGN DEMO</span>
        <span>FICTIONAL DATA · CHANGES LAST UNTIL REFRESH · NO SIGN-IN</span>
      </div>
      <main className="bx-main">
        <section className="bx-heading">
          <div>
            <p className="bx-kicker">
              YOUR WORKSPACE, AT A GLANCE / 18 OCT 2026
            </p>
            <h1>{tab === "Overview" ? "Good work starts here." : tab}</h1>
            <p>Every case. Every payment. A clear next move.</p>
          </div>
          {role === "Admin" && (
            <button
              className="bx-button primary"
              onClick={() => {
                setCreating(true);
                setSelected(null);
                dialog.current?.showModal();
              }}
            >
              Register new case
            </button>
          )}
        </section>
        <div className="bx-stats">
          {[
            [
              "ACTIVE CASES",
              cases.length,
              "All cases",
              "Across your workspace",
            ],
            [
              "NEEDS ATTENTION",
              cases.filter((c) => c.flag === "Overdue").length,
              "Overdue",
              "Cases with delayed action",
            ],
            [
              "OUTSTANDING · PKR",
              money(billed - paid),
              "Outstanding",
              "Billed less allocated",
            ],
            [
              "ALLOCATED · PKR",
              money(paid),
              "All cases",
              "Applied to case charges",
            ],
          ].map(([label, value, f, sub], i) => (
            <button
              key={label}
              className={"bx-stat stat-" + i}
              onClick={() => {
                setFilter(String(f));
                setTab("Cases");
              }}
            >
              <span className="bx-kicker">{label}</span>
              <strong>{value}</strong>
              <span>{sub}</span>
              <span className="bx-stat-link">View cases →</span>
            </button>
          ))}
        </div>
        <div className="bx-workspace">
          <section className="bx-panel bx-register">
            <div className="bx-section-title">
              <div>
                <p className="bx-kicker">THE WORK IN FRONT OF YOU</p>
                <h2>
                  {tab === "Client ledger"
                    ? "Client balances"
                    : tab === "Documents"
                      ? "Document workspace"
                      : tab === "Reports"
                        ? "Printable reports"
                      : tab === "Associates"
                        ? "Service associates"
                        : "Case register"}
                </h2>
              </div>
              <button className="bx-button" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
            {tab === "Reports" ? (
              <div className="bx-report-workspace">
                <div className="bx-report-actions">
                  <div>
                    <p className="bx-kicker">A4 PRINT PREVIEW / FICTIONAL DATA</p>
                    <h3>Aligned case ledger</h3>
                  </div>
                  <div className="bx-report-controls" aria-label="Report colour set">
                    <button
                      className={reportTheme === "purple" ? "active" : ""}
                      onClick={() => setReportTheme("purple")}
                    >
                      Purple set
                    </button>
                    <button
                      className={reportTheme === "ink" ? "active" : ""}
                      onClick={() => setReportTheme("ink")}
                    >
                      Ink set
                    </button>
                    <button className="bx-button primary" onClick={() => window.print()}>
                      Print A4
                    </button>
                  </div>
                </div>
                <article className={"bx-print-report bx-report-" + reportTheme}>
                  <header>
                    <div>
                      <img src="/brand/brandex-wordmark.png" alt="Brandex" />
                      <p>CASE &amp; LEDGER REPORT</p>
                    </div>
                    <div className="bx-report-meta">
                      <strong>18 OCT 2026</strong>
                      <span>DEMO EXPORT / A4</span>
                    </div>
                  </header>
                  <div className="bx-report-client">
                    <span>CLIENT ACCOUNT</span>
                    <strong>NORTHSTAR FOODS / X-254-002</strong>
                    <span>TRADEMARK: NORTHSTAR · EXAMINATION</span>
                  </div>
                  <table>
                    <thead><tr><th>DATE</th><th>TYPE</th><th>STAGE</th><th>DETAILS</th><th>DUE · PKR</th><th>RECEIVED · PKR</th></tr></thead>
                    <tbody>
                      <tr><td>03 OCT 2026</td><td><span className="bx-print-pill charge">CHARGE</span></td><td>FILING</td><td>PROFESSIONAL FEE</td><td>25,000</td><td>—</td></tr>
                      <tr><td>08 OCT 2026</td><td><span className="bx-print-pill received">RECEIVED</span></td><td>FILING</td><td>BANK TRANSFER</td><td>—</td><td>20,000</td></tr>
                      <tr><td>16 OCT 2026</td><td><span className="bx-print-pill charge">CHARGE</span></td><td>EXAMINATION</td><td>RESPONSE PREPARATION</td><td>20,000</td><td>—</td></tr>
                    </tbody>
                    <tfoot><tr><td colSpan={4}>OUTSTANDING</td><td>45,000</td><td>30,000</td></tr></tfoot>
                  </table>
                  <footer>BRANDEX SUITE · PRIVATE CASE REPORT · PAGE 1 OF 1</footer>
                </article>
              </div>
            ) : tab === "Associates" ? (
              <div className="bx-associates">
                <h3>Hassan Legal Services</h3>
                <p>Contact / payee · no login</p>
                <dl>
                  <dt>Assigned case</dt>
                  <dd>N-042-001</dd>
                  <dt>Assignment liability</dt>
                  <dd>PKR 12,000</dd>
                  <dt>Settled</dt>
                  <dd>PKR 5,000</dd>
                  <dt>Unpaid</dt>
                  <dd>PKR 7,000</dd>
                </dl>
                <button className="bx-button" onClick={() => open(cases[3])}>
                  View assigned case
                </button>
              </div>
            ) : (
              <>
                <div className="bx-tools">
                  <label className="bx-search">
                    <span className="sr-only">
                      Search cases, clients or trademarks
                    </span>
                    <input
                      placeholder="Search case, client or trademark…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </label>
                  <label>
                    <span className="sr-only">Case filter</span>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {[
                        "All cases",
                        "Overdue",
                        "Review",
                        "On track",
                        "Outstanding",
                      ].map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="bx-tabs" aria-label="Case status">
                  {["All cases", "Overdue", "Review"].map((f) => (
                    <button
                      key={f}
                      aria-pressed={filter === f}
                      onClick={() => setFilter(f)}
                    >
                      {f}{" "}
                      <span>
                        {f === "All cases"
                          ? cases.length
                          : cases.filter((c) => c.flag === f).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="bx-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CASE / CLIENT</th>
                        <th>
                          {tab === "Client ledger" ? "BILLED · PKR" : "STAGE"}
                        </th>
                        <th>
                          {tab === "Client ledger"
                            ? "ALLOCATED · PKR"
                            : "ATTENTION"}
                        </th>
                        <th>DUE · PKR</th>
                        <th>
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <button
                              className="bx-case-link"
                              onClick={() => open(c)}
                            >
                              {c.id}
                            </button>
                            <strong>{c.client}</strong>
                            <small>{c.mark}</small>
                          </td>
                          <td>
                            {tab === "Client ledger"
                              ? money(c.billed)
                              : c.stage}
                          </td>
                          <td>
                            {tab === "Client ledger" ? (
                              money(c.paid)
                            ) : (
                              <span
                                className={
                                  "bx-badge " +
                                  c.flag.toLowerCase().replace(" ", "-")
                                }
                              >
                                {c.flag}
                              </span>
                            )}
                          </td>
                          <td className="bx-mono">
                            {money(c.billed - c.paid)}
                          </td>
                          <td>
                            <button
                              className="bx-open"
                              aria-label={"Open " + c.id}
                              onClick={() => open(c)}
                            >
                              {tab === "Documents" ? "Prepare" : "Open"} →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="bx-empty">
                      <h3>No matching cases</h3>
                      <p>Try a different name or clear your filters.</p>
                      <button
                        className="bx-button"
                        onClick={() => {
                          setQ("");
                          setFilter("All cases");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
                <footer className="bx-table-footer">
                  <span>
                    {visible.length} OF {cases.length} CASES
                  </span>
                  <span>SELECT A CASE TO EXPLORE</span>
                </footer>
              </>
            )}
          </section>
          <aside className="bx-side">
            <section className="bx-panel bx-next">
              <p className="bx-kicker">MAKE THE NEXT MOVE</p>
              <h2>
                Attention queue
                <span className="bx-count">
                  {cases.filter((c) => c.flag !== "On track").length}
                </span>
              </h2>
              {cases
                .filter((c) => c.flag !== "On track")
                .slice(0, 3)
                .map((c, i) => (
                  <button
                    className="bx-task"
                    key={c.id}
                    onClick={() => open(c)}
                  >
                    <span className="bx-task-number">0{i + 1}</span>
                    <span>
                      <small>
                        {c.id} · {c.flag.toUpperCase()}
                      </small>
                      <strong>{c.next}</strong>
                      <span>{c.client}</span>
                    </span>
                  </button>
                ))}
            </section>
            <section className="bx-panel bx-finance">
              <p className="bx-kicker">FINANCIAL SNAPSHOT / PKR</p>
              <h2>Keep the balance clear.</h2>
              <dl>
                <dt>Total billed</dt>
                <dd>{money(billed)}</dd>
                <dt>Allocated</dt>
                <dd>{money(paid)}</dd>
                <dt>Outstanding</dt>
                <dd>{money(billed - paid)}</dd>
                <dt>Client advance</dt>
                <dd>0</dd>
              </dl>
              <button
                className="bx-button"
                onClick={() => setTab("Client ledger")}
              >
                Open client ledger →
              </button>
              <p>
                Monthly Billing keeps debt visible. Advance terms require full
                stage allocation.
              </p>
            </section>
          </aside>
        </div>
        <footer className="bx-footer">
          <span>BRANDEX SUITE / CASES • ACCOUNTS • DOCUMENTS</span>
          <button
            onClick={() => {
              setCases(seed);
              setQ("");
              setFilter("All cases");
              setNotice("Demo reset.");
            }}
          >
            Reset demo
          </button>
        </footer>
        <p role="status" className="bx-notice">
          {notice}
        </p>
      </main>
      <dialog ref={dialog} className="bx-dialog">
        <div className="bx-dialog-head">
          <span className="bx-kicker">
            {creating ? "SAMPLE CASE REGISTRATION" : selected?.id}
          </span>
          <button
            autoFocus
            aria-label="Close dialog"
            className="bx-button"
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const c: Case = {
                id: "DEMO-" + String(cases.length + 1).padStart(3, "0"),
                client: String(f.get("client")),
                mark: String(f.get("mark")),
                stage:
                  String(f.get("origin")) === "stage2"
                    ? "Acknowledgment"
                    : String(f.get("origin")) === "stage3"
                      ? "Examination"
                      : "Filing",
                origin: String(f.get("origin")),
                flag: "Review",
                billed: 0,
                paid: 0,
                next: "Review registration and configure stage rates",
              };
              setCases([...cases, c]);
              setNotice(
                "Sample case registered. Rates still need configuration.",
              );
              dialog.current?.close();
            }}
          >
            <h2>Start with the client.</h2>
            <p>Demo registration · no live records created.</p>
            <label>
              CLIENT / TRADING AS
              <input
                name="client"
                required
                maxLength={120}
                list="bx-clients"
                placeholder="Find an existing client or enter a new name"
              />
            </label>
            <datalist id="bx-clients">
              {cases.map((c) => (
                <option key={c.id} value={c.client} />
              ))}
            </datalist>
            <label>
              TRADEMARK
              <input name="mark" required maxLength={100} />
            </label>
            <label>
              APPLICATION ORIGIN
              <select name="origin">
                <option value="fresh">Fresh application</option>
                <option value="stage2">Existing case — stage 2</option>
                <option value="stage3">Existing case — stage 3</option>
              </select>
            </label>
            <button className="bx-button primary" type="submit">
              Create sample case
            </button>
          </form>
        ) : (
          selected && (
            <>
              <h2>{selected.client}</h2>
              <p>
                {selected.mark} · {selected.stage}
              </p>
              <span
                className={
                  "bx-badge " + selected.flag.toLowerCase().replace(" ", "-")
                }
              >
                {selected.flag}
              </span>
              <div className="bx-detail">
                <h3>Next action</h3>
                <p>{selected.next}</p>
                <dl>
                  <dt>Billed</dt>
                  <dd>PKR {money(selected.billed)}</dd>
                  <dt>Allocated</dt>
                  <dd>PKR {money(selected.paid)}</dd>
                  <dt>Outstanding</dt>
                  <dd>PKR {money(selected.billed - selected.paid)}</dd>
                </dl>
              </div>
              <button
                className="bx-button"
                onClick={() => setDocument(!document)}
              >
                {document ? "Hide document" : "Preview case information sheet"}
              </button>
              {document && (
                <article className="bx-document">
                  <p className="bx-kicker">
                    SAMPLE DOCUMENT / CASE INFORMATION
                  </p>
                  <h3>{selected.mark}</h3>
                  <p>
                    Client: {selected.client}
                    <br />
                    Case reference: {selected.id}
                    <br />
                    Current stage: {selected.stage}
                  </p>
                  <p>Prepared using fictional demo data.</p>
                  <button
                    className="bx-button"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob(
                          [
                            `CASE INFORMATION\nClient: ${selected.client}\nCase: ${selected.id}\nStage: ${selected.stage}\nFICTIONAL DEMO DATA`,
                          ],
                          { type: "text/plain" },
                        ),
                      );
                      const a = window.document.createElement("a");
                      a.href = url;
                      a.download = selected.id + "-sample.txt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download sample
                  </button>
                </article>
              )}
            </>
          )
        )}
      </dialog>
    </div>
  );
}
