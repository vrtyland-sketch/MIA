"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { isEngine2StubEnabled } = require("../engine2");
const { getCompositionStatus } = require("../engine2/composition");
const { safeRequire } = require("../scripts/MIA_SAFE_REQUIRE");
const { buildEngine2AdminSnapshot } = require("../engine2/wiring");

const ROOT = path.join(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("getCompositionStatus returns numeric inventory", () => {
  const status = getCompositionStatus({ indexPath: INDEX_PATH });
  assert.equal(status.phase, "E5a");
  assert.equal(typeof status.indexLines, "number");
  assert.ok(status.indexLines > 500);
  assert.equal(status.targetLines, 500);
  assert.equal(typeof status.progressPct, "number");
  assert.ok(status.progressPct >= 0 && status.progressPct <= 100);
  assert.equal(typeof status.modulesRequiredApprox, "number");
  assert.ok(status.modulesRequiredApprox > 50);
  assert.ok(Array.isArray(status.nextCandidates));
  assert.ok(status.nextCandidates.length >= 3);
  assert.match(status.note, /thin slices/i);
});

test("safeRequire returns fallback and does not throw on missing module", () => {
  const fallback = { marker: "e5a-fallback" };
  const result = safeRequire("./__MIA_E5A_MISSING_MODULE__", fallback);
  assert.deepEqual(result, fallback);
});

test("index.js uses external safeRequire module", () => {
  const src = fs.readFileSync(INDEX_PATH, "utf8");
  assert.match(src, /require\s*\(\s*["']\.\/scripts\/MIA_SAFE_REQUIRE["']\s*\)/);
  assert.doesNotMatch(src, /function safeRequire\s*\(/);
});

test("MIA_ENGINE2_STUB defaults OFF — no admin snapshot", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  delete process.env.MIA_ENGINE2_STUB;
  assert.equal(isEngine2StubEnabled(), false);
  assert.equal(buildEngine2AdminSnapshot({}), undefined);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

test("MIA_ENGINE2_STUB=1 admin snapshot includes composition (E5a)", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  process.env.MIA_ENGINE2_STUB = "1";
  const snap = buildEngine2AdminSnapshot({ indexPath: INDEX_PATH });
  assert.equal(snap.phase, "E5a");
  assert.ok(snap.composition);
  assert.equal(snap.composition.phase, "E5a");
  assert.ok(snap.composition.indexLines > 500);
  assert.ok(snap.plugins);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

console.log("mia_engine2_e5_contract: all passed");
