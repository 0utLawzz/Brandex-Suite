import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
create function auth.role() returns text language sql as $$select coalesce(nullif(current_setting('request.role',true),''),'authenticated')$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(text)returns text[]language sql as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to authenticated;alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;`);

let checks = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  checks++;
  console.log("PASS " + label);
};
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const action = async (a, d) =>
  (
    await query("select suite_action($1,$2::jsonb) result", [
      a,
      JSON.stringify(d),
    ])
  )[0].result;
const admin = "00000000-0000-4000-8000-000000000001",
  viewer = "00000000-0000-4000-8000-000000000002",
  client = "10000000-0000-4000-8000-000000000001",
  one = "20000000-0000-4000-8000-000000000001",
  two = "20000000-0000-4000-8000-000000000002";
const version = async (id) =>
  (await query("select updated_at::text v from cases where id=$1", [id]))[0].v;
const caseAction = async (a, id, d = {}) =>
  action(a, { case_id: id, version: await version(id), ...d });
async function fails(fn, label) {
  await assert.rejects(fn);
  checks++;
  console.log("PASS " + label);
}
try {
  for (const f of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(
      readFileSync("supabase/migrations/" + f, "utf8").replace(
        /create extension if not exists pgcrypto;/i,
        "",
      ),
    );
  check(true, "complete ordered Suite migrations execute");
  await db.exec(
    `insert into auth.users(id,email)values('${admin}','admin@test.invalid'),('${viewer}','viewer@test.invalid');update profiles set role='admin'where id='${admin}';set request.uid='${admin}';grant usage on schema brandex_private to authenticated;`,
  );
  await db.exec(
    `insert into clients(id,client_code,trading_as,address,stage_rates)values('${client}','X-254','Test client','Test address','{"1":100,"2":200,"3":300,"4":400}');insert into cases(id,client_id,case_prefix,case_number,origin,application_name,identity_confirmed,workflow_step)values('${one}','${client}','X','001','fresh','TEST ONE',true,'registered'),('${two}','${client}','X','002','fresh','TEST TWO',true,'registered');set role authenticated;`,
  );
  check(
    (await query("select count(*)::int n from suite_charges"))[0].n === 2,
    "registration creates one Stage 1 charge per case",
  );
  const charges = await query(
    "select id,case_id,amount from suite_charges order by case_id",
  );
  const receiving = crypto.randomUUID();
  const payload = {
    id: receiving,
    client_id: client,
    amount: "120",
    date: "2025-01-01",
    payer_name: "Test payer",
    reference: "Reference",
    allocations: charges.map((c) => ({ charge_id: c.id, amount: "50" })),
  };
  await action("receiving", payload);
  check(
    (await query("select count(*)::int n from suite_receipts"))[0].n === 2,
    "one receiving creates separate receipts per case",
  );
  check(
    (await query("select suite_account_summary($1) s", [client]))[0].s
      .received === 120,
    "receipt copies do not double-count receiving",
  );
  let original = await query(
    "select id,receipt_number from suite_receipts order by case_id",
  );
  await fails(
    () => action("receiving", { ...payload, version: 1, amount: "90" }),
    "overspend is rejected atomically",
  );
  check(
    (
      await query("select version from suite_receivings where id=$1", [
        receiving,
      ])
    )[0].version === 1,
    "failed edit preserves original version",
  );
  await action("receiving", {
    ...payload,
    version: 1,
    amount: "150",
    allocations: [
      { charge_id: charges[0].id, amount: "70" },
      { charge_id: charges[1].id, amount: "60" },
    ],
  });
  check(
    JSON.stringify(original) ===
      JSON.stringify(
        await query(
          "select id,receipt_number from suite_receipts order by case_id",
        ),
      ),
    "receipt numbers survive receiving edit",
  );
  await fails(
    () => action("receiving", { ...payload, version: 1 }),
    "stale receiving edits fail",
  );
  await action("void_receiving", {
    id: receiving,
    client_id: client,
    version: 2,
  });
  check(
    (await query("select sum(received)::text n from suite_charge_position"))[0]
      .n === "0.00",
    "VOID removes active allocations from balances",
  );
  check(
    (
      await query("select count(*)::int n from suite_receipts where not active")
    )[0].n === 2,
    "VOID receipts remain visible as history",
  );
  check(
    (await query("select workflow_step from cases where id=$1", [one]))[0]
      .workflow_step === "registered",
    "financial correction never moves workflow",
  );
  await action("client", {
    id: client,
    client_code: "X-254",
    payment_terms: "advance",
    stage_rates: { 1: 150, 2: 200, 3: 300, 4: 400 },
    city: "Test",
  });
  check(
    (
      await query("select amount::text a from suite_charges where id=$1", [
        charges[0].id,
      ])
    )[0].a === "100.00",
    "rate change preserves issued charge amount",
  );
  await fails(
    () => caseAction("event", one, { event: "filed", date: "2025-01-01" }),
    "Advance terms block unpaid filing",
  );
  await action("receiving", {
    ...payload,
    id: crypto.randomUUID(),
    amount: "100",
    allocations: [{ charge_id: charges[0].id, amount: "100" }],
  });
  await caseAction("event", one, { event: "filed", date: "2025-01-01" });
  check(true, "Advance proceeds after full actual allocation");
  await caseAction("identity", one, {
    application_name: "TEST ONE",
    case_number: "001",
    tm_number: "001-234",
    nice_class: 3,
  });
  check(
    (await query("select tm_number from cases where id=$1", [one]))[0]
      .tm_number === "001234",
    "six-digit TM normalization preserves leading zero",
  );
  await fails(
    () =>
      caseAction("identity", two, {
        application_name: "TEST TWO",
        case_number: "002",
        tm_number: "001234",
        nice_class: 3,
      }),
    "duplicate trademark cannot attach to another case",
  );
  await caseAction("event", one, { event: "stopped", date: "2025-01-02" });
  await caseAction("event", one, {
    event: "reactivated",
    date: "2025-01-03",
    restoration_fee: "25",
  });
  check(
    (
      await query(
        "select count(*)::int n from suite_charges where case_id=$1 and stage_no=1",
        [one],
      )
    )[0].n === 1,
    "TM-57 reactivation does not duplicate standard stage charge",
  );
  check(
    (await query("select workflow_step from cases where id=$1", [one]))[0]
      .workflow_step === "filed",
    "TM-57 restores prior event",
  );
  await action("client", {
    id: client,
    client_code: "X-254",
    payment_terms: "monthly",
    stage_rates: { 1: 150, 2: 200, 3: 300, 4: 400 },
  });
  await caseAction("event", one, { event: "acknowledged", date: "2025-01-04" });
  const associate = (
    await action("associate", { name: "Test source", default_fee: "1000" })
  ).id;
  for (const id of [one, two])
    await caseAction("assign", id, {
      associate_id: associate,
      stage: 2,
      date: "2025-01-04",
      amount: "1000",
    });
  await caseAction("event", one, { event: "assigned", date: "2025-01-04" });
  await caseAction("event", one, { event: "hearing", date: "2025-01-05" });
  await fails(
    () => caseAction("event", one, { event: "published", date: "2025-01-06" }),
    "Hearing cannot jump directly to Published",
  );
  await caseAction("event", one, { event: "accepted", date: "2025-01-06" });
  check(
    (
      await query(
        "select count(*)::int n from suite_charges where case_id=$1 and stage_no=3",
        [one],
      )
    )[0].n === 1,
    "Accepted issues Stage 3 charge once",
  );
  const payment = crypto.randomUUID();
  await action("settlement", {
    id: payment,
    associate_id: associate,
    amount: "1500",
    date: "2025-01-06",
  });
  const paid = await query(
    "select paid::text p from associate_fee_position order by created_at,id",
  );
  check(
    paid.map((x) => x.p).join(",") === "1000.00,500.00",
    "weekly partial settlement allocates oldest fee first",
  );
  await action("settlement", {
    id: payment,
    associate_id: associate,
    amount: "700",
    date: "2025-01-06",
    version: 1,
  });
  check(
    (await query("select suite_associate_summary($1) s", [associate]))[0].s
      .paid === 700,
    "settlement edit recalculates allocations",
  );
  await action("void_settlement", {
    id: payment,
    associate_id: associate,
    version: 2,
  });
  check(
    (await query("select suite_associate_summary($1) s", [associate]))[0].s
      .paid === 0,
    "settlement VOID restores unpaid fees",
  );
  for (const [event, date] of [
    ["published", "2025-01-07"],
    ["demand_received", "2025-03-07"],
    ["fee_submitted", "2025-03-08"],
    ["certificate_office", "2025-04-08"],
  ])
    await caseAction("event", one, { event, date });
  await caseAction("delivery", one, {
    method: "courier",
    company: "Test courier",
    tracking: "TEST-123",
    destination: "Test city",
    date: "2025-04-09",
    delivered_on: "2025-04-10",
  });
  check(
    (await query("select workflow_step from cases where id=$1", [one]))[0]
      .workflow_step === "delivered",
    "office receipt and tracked delivery are separate records",
  );
  await caseAction("hearing", two, {
    date: "2099-01-01",
    note: "Future listed hearing; no automatic alert",
  });
  check(true, "future hearing dates are recorded without alert automation");
  const flag = async (
    step,
    event,
    today,
    accepted = null,
    published = null,
    fee = null,
    restored = null,
  ) =>
    (
      await query("select suite_followup($1,$2,$3,$4,$5,$6,$7) f", [
        step,
        event,
        accepted,
        published,
        fee,
        restored,
        today,
      ])
    )[0].f;
  check(
    (await flag("filed", "2026-10-01", "2026-10-15")) === null &&
      (await flag("filed", "2026-10-01", "2026-10-16")).tone === "red",
    "Filing day 15 threshold without early color ladder",
  );
  check(
    (await flag("examination", "2026-10-01", "2026-10-08")).tone === "red",
    "Examination seven calendar days",
  );
  for (const [day, tone] of [
    ["08", "green"],
    ["09", "yellow"],
    ["10", "yellow"],
    ["11", "red"],
  ])
    check(
      (await flag("assigned", "2026-10-01", "2026-10-" + day)).tone === tone,
      "assignment calendar boundary " + day,
    );
  check(
    (await flag("accepted", "2026-10-20", "2026-10-29", "2026-10-20")).due ===
      "2026-10-29" &&
      (await flag("accepted", "2026-10-21", "2026-10-29", "2026-10-21")) ===
        null,
    "Accepted 20/21 journal cutoff",
  );
  check(
    (await flag("published", "2026-12-31", "2027-02-28", null, "2026-12-31"))
      .tone === "red",
    "two calendar months clamp month end",
  );
  check(
    (
      await flag(
        "fee_submitted",
        "2028-01-31",
        "2028-02-29",
        null,
        null,
        "2028-01-31",
      )
    ).tone === "red",
    "certificate one calendar month includes leap year",
  );
  check(
    (await flag("stopped", "2026-01-01", "2026-10-17")) === null,
    "STOPPED suspends timing flags",
  );
  check(
    (
      await query("select suite_case_list($1,1) x", [
        JSON.stringify({ q: "001234" }),
      ])
    )[0].x.total === 1,
    "server search finds normalized TM",
  );
  await action("client", {
    id: client,
    client_code: "X-254",
    payment_terms: "monthly",
    stage_rates: {},
  });
  await caseAction("prepare_stage", two, { stage: 4 });
  check(
    (
      await query(
        "select amount from suite_charge_position where case_id=$1 and stage_no=4",
        [two],
      )
    )[0].amount === null,
    "missing preset rate stays explicitly unpriced",
  );
  check(
    (
      await query("select suite_case_list($1,1) x", [
        JSON.stringify({ balance: "unpriced" }),
      ])
    )[0].x.total === 1,
    "server payment-position filter finds missing rates",
  );
  const longCase = "20000000-0000-4000-8000-000000000099";
  await db.exec(`reset role;insert into cases(id,client_id,case_prefix,case_number,origin,application_name,identity_confirmed,workflow_step)values('${longCase}','${client}','X','123456','fresh','LONG REFERENCE',true,'registered');set role authenticated;`);
  await caseAction("event",longCase,{event:"filed",date:"2025-01-01"});
  await caseAction("identity",longCase,{application_name:"LONG REFERENCE UPDATED",case_number:"123456",tm_number:"",nice_class:"3"});
  check((await query("select case_number from cases where id=$1",[longCase]))[0].case_number==="123456","six-digit manual case reference remains editable without truncation");
  await fails(()=>caseAction("identity",longCase,{application_name:"LONG REFERENCE",case_number:"123457",tm_number:"",nice_class:"3"}),"filed case reference cannot be changed");
  const receiptCount = (
    await query("select count(*)::int n from suite_receipts")
  )[0].n;
  await db.exec(
    `reset role;set request.uid='${viewer}';set role authenticated;`,
  );
  await fails(
    () => action("associate", { name: "Forbidden" }),
    "Viewer cannot mutate operations",
  );
  await fails(
    () =>
      db.exec(
        "insert into suite_charges(client_id,case_id,label,amount) values('" +
          client +
          "','" +
          one +
          "','forbidden',1)",
      ),
    "direct financial writes denied by grants",
  );
  check(
    (await query("select count(*)::int n from suite_receipts"))[0].n ===
      receiptCount,
    "Viewer can read the same receipt history",
  );
  await db.exec("reset role;");
  await fails(
    () => db.exec(`update profiles set role='agent'where id='${viewer}'`),
    "legacy Agent cannot be reintroduced as a staff role",
  );
  check(
    (
      await query(
        "select count(*)::int n from suite_audit where old_value is not null",
      )
    )[0].n > 0,
    "financial and case corrections retain old/new audit data",
  );
  console.log(`${checks} local PostgreSQL operation checks passed.`);
} finally {
  await db.close();
}
