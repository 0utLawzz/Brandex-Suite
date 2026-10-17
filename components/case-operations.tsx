"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  perform,
  money,
  todayPK,
  stepLabels,
  transitions,
  type Charge,
} from "@/lib/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
export type OperationalCase = {
  id: string;
  client_id: string;
  case_number: string;
  application_name: string;
  tm_number: string | null;
  nice_class: number | null;
  identity_confirmed: boolean;
  workflow_stage: number;
  workflow_step: string;
  updated_at: string;
  certificate_on: string | null;
  restoration_filed_on: string | null;
  restoration_approved_on: string | null;
  drive_sync_pending: boolean;
};
type Associate = { id: string; name: string; default_fee: string };
type Event = {
  id: string;
  event: string;
  event_date: string;
  from_step: string;
  to_step: string;
  note: string;
};
export default function CaseOperations({
  record: c,
  canWrite,
}: {
  record: OperationalCase;
  canWrite: boolean;
}) {
  const [sb] = useState(() => createClient()),
    router = useRouter();
  const [charges, setCharges] = useState<Charge[]>([]),
    [associates, setAssociates] = useState<Associate[]>([]),
    [fees, setFees] = useState<
      {
        id: string;
        name: string;
        stage_no: number;
        amount: string;
        paid: string;
        outstanding: string;
      }[]
    >([]),
    [events, setEvents] = useState<Event[]>([]),
    [files, setFiles] = useState<
      { upload_id: string; file_name: string; file_id: string }[]
    >([]);
  const [delivery, setDelivery] = useState<Record<
    string,
    string | null
  > | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [event, setEvent] = useState((transitions[c.workflow_step] ?? [])[0] ?? ""),
    [associate, setAssociate] = useState(""),
    [fee, setFee] = useState("1000");
  const choices =
    c.workflow_step === "review"
      ? [
          "filed",
          "examination",
          "acknowledged",
          "assigned",
          "accepted",
          "hearing",
          "published",
          "demand_received",
          "objection",
          "fee_submitted",
          "certificate_office",
        ]
      : (transitions[c.workflow_step] ?? []);
  async function load() {
    const [a, b, d, e, f] = await Promise.all([
      sb
        .from("suite_charge_position")
        .select("*")
        .eq("case_id", c.id)
        .order("created_at")
        .limit(100),
      sb
        .from("service_associates")
        .select("id,name,default_fee")
        .eq("active", true)
        .order("name")
        .limit(200),
      sb
        .from("associate_fee_position")
        .select("id,name,stage_no,amount,paid,outstanding")
        .eq("case_id", c.id)
        .order("stage_no"),
      sb
        .from("suite_events")
        .select("id,event,event_date,from_step,to_step,note")
        .eq("case_id", c.id)
        .order("created_at", { ascending: false })
        .limit(100),
      sb
        .from("drive_files")
        .select("upload_id,file_name,file_id")
        .eq("case_id", c.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if ([a, b, d, e, f].some((x) => x.error))
      throw new Error("Could not load case operations");
    setCharges(a.data ?? []);
    setAssociates(b.data ?? []);
    setFees(d.data ?? []);
    setEvents(e.data ?? []);
    setFiles(f.data ?? []);
  }
  useEffect(() => {
    sb.from("case_delivery")
      .select("*")
      .eq("case_id", c.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError("Could not load delivery record");
        else setDelivery(data);
      });
    load().catch((e) => setError(e.message));
    const warning = sessionStorage.getItem(`case-warning-${c.id}`);
    if (warning) {
      setMessage(warning);
      sessionStorage.removeItem(`case-warning-${c.id}`);
    }
  }, [c.updated_at, sb]);
  async function save(action: string, data: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await perform(action, { case_id: c.id, version: c.updated_at, ...data });
      setMessage("Saved.");
      if (action === "identity") {
        try {
          const body = new FormData();
          body.set("case_id", c.id);
          body.set("action", "sync");
          const result = await sb.functions.invoke("suite-drive-upload", {
            body,
          });
          if (result.error) {
            let detail: { code?: string; error?: string } = {};
            try {
              detail = await result.error.context.json();
            } catch {}
            if (detail.code !== "NO_FOLDER")
              sessionStorage.setItem(
                `case-warning-${c.id}`,
                "Identity saved; Drive folder name needs retry. " +
                  (detail.error ?? "Check connection."),
              );
          }
        } catch {
          sessionStorage.setItem(
            `case-warning-${c.id}`,
            "Identity saved; Drive folder name needs retry.",
          );
        }
      }
      await load();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function syncFolder() {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("case_id", c.id);
      body.set("action", "sync");
      const result = await sb.functions.invoke("suite-drive-upload", { body });
      if (result.error) {
        let detail = "Could not sync folder name";
        try {
          detail = (await result.error.context.json()).error ?? detail;
        } catch {}
        throw new Error(detail);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function handle(action: string, extra: Record<string, unknown> = {}) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      save(action, {
        ...Object.fromEntries(new FormData(e.currentTarget)),
        ...extra,
      });
    };
  }
  return (
    <>
      <Card>
        <h2>Case identity</h2>
        {c.drive_sync_pending && (
          <p className="notice">
            Drive folder name needs sync.{" "}
            {canWrite && (
              <Button disabled={busy} onClick={syncFolder}>
                RETRY FOLDER NAME
              </Button>
            )}
          </p>
        )}
        {!c.identity_confirmed && (
          <p className="notice">
            Existing record: confirm its client/case reference and mark, then
            record its actual current event. No historical payments or dates are
            guessed.
          </p>
        )}
        <form onSubmit={handle("identity")}>
          <fieldset
            disabled={!canWrite || busy}
            style={{ border: 0, padding: 0 }}
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="case-mark">Mark / application name</label>
                <Input
                  id="case-mark"
                  name="application_name"
                  defaultValue={c.application_name}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="case-reference-number">Case number</label>
                <Input
                  id="case-reference-number"
                  name="case_number"
                  defaultValue={c.case_number}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="case-tm">Trademark number · six digits</label>
                <Input
                  id="case-tm"
                  name="tm_number"
                  defaultValue={c.tm_number ?? ""}
                  inputMode="numeric"
                  maxLength={12}
                />
              </div>
              <div className="field">
                <label htmlFor="case-class">Class</label>
                <Input
                  id="case-class"
                  name="nice_class"
                  defaultValue={c.nice_class ?? ""}
                  type="number"
                  min="1"
                  max="45"
                />
              </div>
            </div>
            {canWrite && <Button type="submit">SAVE IDENTITY</Button>}
          </fieldset>
        </form>
      </Card>
      <Card className="module-card">
        <h2>Stage charges & payment verification</h2>
        <p>
          Allocated receiving confirms case/stage payment. Monthly credit does
          not mean Paid.
        </p>
        <div className="table-scroll">
          <table className="nb-table">
            <thead>
              <tr>
                <th>CHARGE</th>
                <th>BILLED</th>
                <th>ALLOCATED</th>
                <th>OUTSTANDING</th>
              </tr>
            </thead>
            <tbody>
              {charges
                .filter((x) => !(x as Charge & { voided?: boolean }).voided)
                .map((x) => (
                  <tr key={x.id}>
                    <td>{x.label}</td>
                    <td>{money(x.amount)}</td>
                    <td>{money(x.received)}</td>
                    <td>{money(x.outstanding)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Link
          className="nb-button nb-button-teal"
          href={`/accounts/${c.client_id}`}
        >
          OPEN CLIENT LEDGER / RECEIVING
        </Link>
        {canWrite && (
          <details>
            <summary>
              Prepare stage bill / confirm missing rate / extra charge
            </summary>
            <form onSubmit={handle("prepare_stage")}>
              <label htmlFor="prepare-stage">
                Prepare a stage charge without moving the case
              </label>
              <select className="nb-input" id="prepare-stage" name="stage">
                {[1, 2, 3, 4].map((s) => (
                  <option key={s} value={s}>
                    Stage {s}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={busy}>
                PREPARE CHARGE
              </Button>
            </form>
            <form onSubmit={handle("charge")}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="price-charge">Charge</label>
                  <select
                    id="price-charge"
                    name="charge_id"
                    className="nb-input"
                  >
                    <option value="">New extra charge</option>
                    {charges
                      .filter((x) => x.amount == null)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label} · rate needed
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="extra-label">Extra charge description</label>
                  <Input
                    id="extra-label"
                    name="label"
                    placeholder="Required for a new extra charge"
                  />
                </div>
                <div className="field">
                  <label htmlFor="extra-amount">Amount</label>
                  <Input
                    id="extra-amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy}>
                CONFIRM CHARGE
              </Button>
            </form>
          </details>
        )}
      </Card>
      <Card className="module-card">
        <h2>Case workflow · Stage {c.workflow_stage}</h2>
        <p>
          <strong>{stepLabels[c.workflow_step] ?? c.workflow_step}</strong>
        </p>
        <p>
          Record actual events and dates. Flags never move the case
          automatically.
        </p>
        {canWrite && (
          <form onSubmit={handle("event", { event })}>
            <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="case-event">Next event</label>
                  <select
                    id="case-event"
                    className="nb-input"
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    required
                  >
                    <option value="">Choose actual event</option>
                    {choices.map((s) => (
                      <option key={s} value={s}>
                        {stepLabels[s]}
                      </option>
                    ))}
                    {c.workflow_step !== "stopped" && (
                      <option value="stopped">STOPPED</option>
                    )}
                    {c.workflow_step === "stopped" && (
                      <option value="reactivated">
                        TM-57 submitted — reactivate
                      </option>
                    )}
                    {c.restoration_filed_on && !c.restoration_approved_on && (
                      <option value="restoration_approved">
                        IPO restoration approved
                      </option>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="event-date">Actual event date</label>
                  <Input
                    id="event-date"
                    name="date"
                    type="date"
                    max={todayPK()}
                    defaultValue={todayPK()}
                    required
                  />
                </div>
                {event === "reactivated" && (
                  <div className="field">
                    <label htmlFor="restore-fee">Separate TM-57 charge</label>
                    <Input
                      id="restore-fee"
                      name="restoration_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                )}
                <div className="field full">
                  <label htmlFor="event-note">Notes / verification</label>
                  <textarea className="nb-input" id="event-note" name="note" />
                </div>
              </div>
              <Button type="submit" variant="accent" disabled={!event || busy}>
                RECORD EVENT
              </Button>
            </fieldset>
          </form>
        )}
        {c.workflow_step === "objection" && (
          <p>
            Objection follow-up stays in hearing/history. No automatic Demand
            Note or hearing deadline is applied.
          </p>
        )}
      </Card>
      <Card className="module-card">
        <h2>Service Associate · separate from client fees</h2>
        {fees.map((f) => (
          <p key={f.id}>
            Stage {f.stage_no} · {f.name} · payable {money(f.amount)} · paid{" "}
            {money(f.paid)} · unpaid {money(f.outstanding)}
          </p>
        ))}
        {!fees.length && <p>No assignment fees yet.</p>}
        {canWrite && (
          <form
            onSubmit={handle("assign", {
              associate_id: associate,
              amount: fee,
            })}
          >
            <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="associate-choice">Service Associate</label>
                  <select
                    className="nb-input"
                    id="associate-choice"
                    value={associate}
                    onChange={(e) => {
                      setAssociate(e.target.value);
                      setFee(
                        String(
                          associates.find((a) => a.id === e.target.value)
                            ?.default_fee ?? 1000,
                        ),
                      );
                    }}
                    required
                  >
                    <option value="">Choose contact</option>
                    {associates.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="assign-stage">Case stage</label>
                  <select
                    id="assign-stage"
                    name="stage"
                    className="nb-input"
                    defaultValue={
                      c.workflow_step === "acknowledged" ? 2 : c.workflow_stage
                    }
                  >
                    {[1, 2, 3, 4].map((s) => (
                      <option key={s} value={s}>
                        Stage {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="associate-fee">Agreed fee</label>
                  <Input
                    id="associate-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="assign-date">Assigned on</label>
                  <Input
                    id="assign-date"
                    type="date"
                    name="date"
                    max={todayPK()}
                    defaultValue={todayPK()}
                    required
                  />
                </div>
              </div>
              <Button type="submit">RECORD ASSIGNMENT / PAYABLE</Button>
            </fieldset>
          </form>
        )}
        <Link className="nb-button" href="/associates">
          CONTACTS & SETTLEMENTS
        </Link>
      </Card>
      <Card className="module-card">
        <h2>Certificate delivery</h2>
        <p>
          Office receipt: {c.certificate_on ?? "Not yet recorded"}. Waiting for
          client collection has no automatic overdue.
        </p>
        {delivery && (
          <div className="nb-panel">
            <strong>
              {delivery.method === "hand" ? "Hand collected" : delivery.company}
            </strong>
            <p>
              Tracking: {delivery.tracking || "—"} · {delivery.destination}
            </p>
            <p>
              Dispatch / collection: {delivery.dispatched_on} · Delivered:{" "}
              {delivery.delivered_on || "Not confirmed"}
            </p>
            {files.find((f) => f.upload_id === delivery.receipt_file_id) && (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://drive.google.com/file/d/${files.find((f) => f.upload_id === delivery.receipt_file_id)!.file_id}/view`}
              >
                OPEN DELIVERY RECEIPT
              </a>
            )}
          </div>
        )}
        {canWrite && c.certificate_on && (
          <form
            key={delivery?.updated_at ?? "new-delivery"}
            onSubmit={handle("delivery")}
          >
            <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="delivery-method">Method</label>
                  <select
                    id="delivery-method"
                    className="nb-input"
                    name="method"
                    defaultValue={delivery?.method ?? "courier"}
                  >
                    <option value="courier">Courier</option>
                    <option value="hand">Hand collected</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="dispatch-date">
                    Dispatch / collection date
                  </label>
                  <Input
                    id="dispatch-date"
                    name="date"
                    type="date"
                    defaultValue={delivery?.dispatched_on ?? todayPK()}
                    max={todayPK()}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="courier">Courier company</label>
                  <Input
                    id="courier"
                    name="company"
                    defaultValue={delivery?.company ?? ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tracking">Tracking number</label>
                  <Input
                    id="tracking"
                    name="tracking"
                    defaultValue={delivery?.tracking ?? ""}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="destination">
                    Destination / collected by
                  </label>
                  <Input
                    id="destination"
                    name="destination"
                    defaultValue={delivery?.destination ?? ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="delivered">Delivery confirmation date</label>
                  <Input
                    id="delivered"
                    name="delivered_on"
                    type="date"
                    defaultValue={delivery?.delivered_on ?? ""}
                    max={todayPK()}
                  />
                </div>
                <div className="field">
                  <label htmlFor="delivery-receipt">Uploaded receipt</label>
                  <select
                    id="delivery-receipt"
                    name="receipt_file_id"
                    className="nb-input"
                  >
                    <option value="">No receipt selected</option>
                    {files.map((f) => (
                      <option key={f.upload_id} value={f.upload_id}>
                        {f.file_name}
                      </option>
                    ))}
                  </select>
                  <small>
                    Upload the courier receipt in Google Drive below, then
                    reload here.
                  </small>
                </div>
              </div>
              <Button type="submit">SAVE DISPATCH / DELIVERY</Button>
            </fieldset>
          </form>
        )}
      </Card>
      <Card className="module-card">
        <h2>Case event history</h2>
        {canWrite && (
          <details>
            <summary>
              Add hearing date / diary note (no automatic alerts)
            </summary>
            <form onSubmit={handle("hearing")}>
              <div className="field">
                <label htmlFor="hearing-date">Hearing date</label>
                <Input id="hearing-date" name="date" type="date" required />
              </div>
              <div className="field">
                <label htmlFor="hearing-note">Notes / outcome</label>
                <textarea
                  id="hearing-note"
                  name="note"
                  className="nb-input"
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                SAVE HEARING NOTE
              </Button>
            </form>
          </details>
        )}
        {events.map((e) => (
          <div className="nb-panel" key={e.id}>
            <strong>
              {e.event_date} · {e.event}
            </strong>
            <p>
              {stepLabels[e.from_step] ?? e.from_step} →{" "}
              {stepLabels[e.to_step] ?? e.to_step}
            </p>
            <p>{e.note}</p>
          </div>
        ))}
        {!events.length && <p>No events recorded yet.</p>}
        <small>
          Latest 100 case events. Financial revisions remain in the separate
          audit trail.
        </small>
      </Card>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
    </>
  );
}
