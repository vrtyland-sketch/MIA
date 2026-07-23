"use strict";

/**
 * Contract: every bank key referenced by production runtime code must exist
 * in text-bank/packs/ with at least one variant.
 */

const assert = require("assert/strict");
const path = require("path");

const { loadTextBank } = require(path.resolve(__dirname, "..", "scripts", "MIA_TEXT_BANK_LOADER"));
const {
  collectRequiredBankKeys,
  getRegistryBankKeys,
  scanProductionBankKeys,
  validateTextBankCoverage
} = require(path.resolve(__dirname, "..", "scripts", "MIA_TEXT_BANK_COVERAGE"));

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- TEXT BANK COVERAGE CONTRACT ----\n");

test("production scan finds runtime bank key references", () => {
  const scanned = scanProductionBankKeys();
  assert.ok(scanned.length >= 30, `expected scanned keys, got ${scanned.length}`);
  assert.ok(scanned.includes("mia_direct_status"));
  assert.ok(scanned.includes("support_small_mia"));
  assert.ok(scanned.includes("mia_proactive_wake"));
  assert.ok(scanned.includes("community_ping_mia"));
});

test("registry stays aligned with scanned production references", () => {
  const scanned = new Set(scanProductionBankKeys());
  const registry = new Set(getRegistryBankKeys());
  const notInRegistry = [...scanned].filter((key) => !registry.has(key));

  assert.equal(
    notInRegistry.length,
    0,
    `Scanned keys missing from MIA_TEXT_BANK_COVERAGE registry:\n  ${notInRegistry.join("\n  ")}`
  );
});

test("all required runtime bank keys exist in TEXT_BANK with variants", () => {
  const { TEXT_BANK } = loadTextBank();
  const report = validateTextBankCoverage(TEXT_BANK);

  if (report.missing.length > 0) {
    assert.fail(
      `Missing text bank keys (${report.missing.length}):\n  ${report.missing.join("\n  ")}`
    );
  }

  if (report.empty.length > 0) {
    assert.fail(
      `Empty text bank keys (${report.empty.length}):\n  ${report.empty.join("\n  ")}`
    );
  }

  assert.ok(report.required.length >= 40);
  console.log(`   covered ${report.required.length} runtime keys`);
});

test("collectRequiredBankKeys matches validate report", () => {
  const required = collectRequiredBankKeys();
  const { TEXT_BANK } = loadTextBank();
  const report = validateTextBankCoverage(TEXT_BANK);

  assert.deepEqual(required, report.required);
});

console.log("\n---- TEXT BANK COVERAGE CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
