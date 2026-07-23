"use strict";

const assert = require("assert/strict");
const { hasIngestPayloadSignal } = require("../scripts/MIA_INGEST_GUARD");

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

test("empty object is rejected", () => {
  assert.equal(hasIngestPayloadSignal({}), false);
});

test("blank source query is rejected", () => {
  assert.equal(hasIngestPayloadSignal({ source: "" }), false);
});

test("gift payload is accepted", () => {
  assert.equal(
    hasIngestPayloadSignal({
      type: "gift",
      platform: "tiktok",
      giftName: "Rose",
      coins: 1
    }),
    true
  );
});

test("chat payload is accepted", () => {
  assert.equal(
    hasIngestPayloadSignal({
      type: "chat",
      value2: "ahoj mia"
    }),
    true
  );
});
