"use strict";

const assert = require("assert/strict");
const gifts = require("../shared/gifts");
const logAudit = require("../scripts/gift_map_log_audit");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("auditNames splits mapped vs generic", () => {
  const counts = new Map([
    ["Rose", 10],
    ["Universe", 2],
    ["TotallyUnknownGiftXYZ", 1]
  ]);
  const audit = logAudit.auditNames(counts);
  assert.equal(audit.mapped.length, 2);
  assert.equal(audit.generic.length, 1);
  assert.equal(audit.generic[0].name, "TotallyUnknownGiftXYZ");
  assert.equal(audit.mapped.find((r) => r.name === "Universe").giftKey, "UNIVERSE");
});

test("logged names Rose Galaxy Universe are not generic", () => {
  const counts = new Map([
    ["Rose", 104],
    ["Galaxy", 2],
    ["Universe", 2]
  ]);
  const audit = logAudit.auditNames(counts);
  assert.equal(audit.generic.length, 0);
  assert.equal(audit.mapped.length, 3);
});

test("catalog includes UNIVERSE key", () => {
  const keys = gifts.listCatalogKeys();
  assert.ok(keys.includes("UNIVERSE"));
  assert.ok(keys.length >= 22);
});

console.log("gift_map_log_audit_contract: all passed");
