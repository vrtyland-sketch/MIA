"use strict";

const assert = require("assert/strict");
const path = require("path");

const { loadTextBank } = require(path.resolve(__dirname, "..", "scripts", "MIA_TEXT_BANK_LOADER"));
const textBankModule = require(path.resolve(__dirname, "..", "scripts", "MIA_TEXT_BANK.js"));

const results = { passed: 0, failed: 0 };

function test(name, fn) {
  try {
    fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

console.log("\n---- TEXT BANK LOADER SMOKE ----\n");

test("loader finds pack files and builds bank", () => {
  const loaded = loadTextBank();
  assert.ok(loaded.stats.packFiles >= 12, "expected migrated pack files");
  assert.ok(loaded.stats.keys >= 67, "expected at least migrated key count");
  assert.ok(loaded.stats.variants >= 667, "expected at least migrated variant count");
});

test("MIA_TEXT_BANK module exports merged bank", () => {
  assert.ok(textBankModule.TEXT_BANK);
  assert.ok(textBankModule.TEXT_BANK_STATS);
  assert.ok(textBankModule.TEXT_BANK_STATS.keys >= 67);
});

test("expansion packs merge into mia_direct_status", () => {
  const variants = textBankModule.TEXT_BANK.mia_direct_status || [];
  assert.ok(variants.length >= 45, `expected expanded status bank, got ${variants.length}`);
  const joined = variants.join(" ").toLowerCase();
  assert.ok(joined.includes("síti") || joined.includes("siti"), "expected network-themed status lines");
});

test("legacy keys remain available", () => {
  assert.ok(Array.isArray(textBankModule.TEXT_BANK.direct_mia));
  assert.ok(Array.isArray(textBankModule.TEXT_BANK.koj_direct_status));
  assert.ok(textBankModule.TEXT_BANK.direct_mia.length >= 15);
});

test("named templates keep {name} placeholder", () => {
  const sample = (textBankModule.TEXT_BANK.mia_direct_status || [])[0] || "";
  assert.ok(sample.includes("{name}"), "direct status variants should use {name}");
});

console.log("\n---- TEXT BANK LOADER SUMMARY ----");
console.log(`passed: ${results.passed}`);
console.log(`failed: ${results.failed}`);

if (results.failed > 0) {
  process.exit(1);
}
