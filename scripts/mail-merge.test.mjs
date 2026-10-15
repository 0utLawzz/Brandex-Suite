import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { placeholders, validateTemplate, customFields, mergeText, caseValues } from "../lib/mail-merge.ts";
import { buildDocument } from "../lib/document-builder.ts";

test("placeholder parsing rejects unsupported and malformed fields", () => {
  assert.equal(validateTemplate("Hello {{trading_as}} {{custom.contact}}"), null);
  assert.match(validateTemplate("{{bad_field}}"), /Unsupported/);
  assert.match(validateTemplate("{{custom.bad key}}"), /Unsupported/);
  assert.match(validateTemplate("{{trading_as}"), /unmatched/);
  assert.match(validateTemplate("Hello {{case_images}}"), /own line/);
  assert.match(validateTemplate("Hello {{ case_images }}"), /own line/);
  assert.equal(validateTemplate("{{ case_images }}"), null);
  assert.deepEqual(placeholders("{{trading_as}} {{ trading_as }}"), ["trading_as"]);
  assert.deepEqual(customFields("{{address}} {{custom.recipient}}"), ["custom.recipient"]);
});
test("merging preserves text safely and does not evaluate custom values", () => {
  assert.equal(mergeText("{{trading_as}} / {{custom.contact}}", { trading_as: "A&B <Foods>" }, { "custom.contact": "$& {{address}}" }), "A&B <Foods> / $& {{address}}");
  assert.equal(caseValues({ case_prefix: "TM", case_number: "42" }, { client_code: "BX" }).case_code, "TM-42");
});
test("DOCX contains escaped text and an embedded image", async () => {
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhCkAAAAASUVORK5CYII=", "base64");
  const file = await buildDocument("Case summary", "A&B <Foods>\n[[BRANDEX_CASE_IMAGES]]", [image]);
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file("word/document.xml").async("string");
  assert.ok(xml.includes("A&amp;B &lt;Foods&gt;"));
  assert.ok(Object.keys(zip.files).some(name => name.startsWith("word/media/") && name.endsWith(".png")));
  assert.ok(!xml.includes("[[BRANDEX_CASE_IMAGES]]"));
  await assert.rejects(() => buildDocument("Missing image", "[[BRANDEX_CASE_IMAGES]]"), /requires a case image/);
});
