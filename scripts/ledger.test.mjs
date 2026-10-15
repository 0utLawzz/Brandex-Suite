import test from "node:test";
import assert from "node:assert/strict";
import { amountInCents, ledgerTotals, validDate } from "../lib/ledger.ts";

test("money preserves cents and matches the database precision", () => {
  assert.equal(amountInCents("0.29"), 29);
  assert.equal(amountInCents("9999999999.99"), 999999999999);
  for (const value of ["1e3", "-1", "1.001", "10000000000", null, {}, NaN]) assert.equal(amountInCents(value), null);
});
test("marking pending paid moves the amount without double counting", () => {
  const entry = { id: "test", amount: "125.51", type: "payment", date: "2026-10-15", status: "pending" };
  assert.deepEqual(ledgerTotals([entry]), { paid: 0, pending: 12551 });
  assert.deepEqual(ledgerTotals([{ ...entry, status: "paid" }]), { paid: 12551, pending: 0 });
  assert.deepEqual(ledgerTotals([]), { paid: 0, pending: 0 });
});
test("dates reject impossible days and accept leap days", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2026-13-01"), false);
});
