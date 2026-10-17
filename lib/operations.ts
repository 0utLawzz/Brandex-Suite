export const stepLabels: Record<string, string> = {
  review: "Review existing workflow",
  registered: "Registered — awaiting filing",
  filed: "Filed",
  examination: "Examination — reply submitted",
  acknowledged: "Acknowledgement",
  assigned: "Assigned",
  accepted: "Accepted",
  hearing: "Hearing",
  published: "Published",
  objection: "Objection",
  demand_received: "Demand Note received",
  fee_submitted: "Ten-year fee submitted",
  certificate_office: "Certificate at office",
  dispatched: "Dispatched",
  delivered: "Delivered",
  stopped: "STOPPED",
  reactivated: "TM-57 reactivation",
  restoration_approved: "IPO restoration approved",
};
export const transitions: Record<string, string[]> = {
  registered: ["filed"],
  filed: ["examination", "acknowledged"],
  examination: ["acknowledged"],
  acknowledged: ["assigned"],
  assigned: ["accepted", "hearing"],
  hearing: ["accepted"],
  accepted: ["published"],
  published: ["demand_received", "objection"],
  demand_received: ["fee_submitted"],
  fee_submitted: ["certificate_office"],
};
export const money = (n: string | number | null | undefined) =>
  n == null
    ? "Rate needed"
    : new Intl.NumberFormat("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n));
export const todayPK = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export async function perform(action: string, data: Record<string, unknown>) {
  const r = await fetch("/api/operations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Could not save");
  return j;
}
export type Charge = {
  id: string;
  case_id: string;
  label: string;
  amount: string | null;
  received: string;
  outstanding: string;
  case_reference: string;
  application_name: string;
  stage_no: number | null;
};
