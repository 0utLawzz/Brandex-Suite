export type LedgerEntry = {
  id: string;
  amount: string | number;
  type: string;
  status: "paid" | "pending";
  date: string | null;
};

// Match numeric(12,2) without floating point rounding or scientific notation.
export function amountInCents(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function ledgerTotals(entries: LedgerEntry[]) {
  return entries.reduce((totals, entry) => {
    totals[entry.status] += amountInCents(entry.amount) ?? 0;
    return totals;
  }, { paid: 0, pending: 0 });
}

export function formatAmount(cents: number) {
  return (cents / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
