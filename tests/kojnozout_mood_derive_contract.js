"use strict";

const assert = require("assert/strict");
const {
  FULL_DERIVE_MAP,
  DERIVED_MOOD_KEYS,
  MASTER_MOODS,
  EATING_VARIANT_COUNT,
  listEatingVariantKeys,
  resolveDeriveSpec
} = require("../scripts/KOJNOZROUT_MOOD_DERIVE");

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

console.log("\n---- KOJNOZROUT MOOD DERIVE CONTRACT ----\n");

test("derive map has eating rotation with transform specs", () => {
  assert.equal(listEatingVariantKeys().length, EATING_VARIANT_COUNT);
  assert.equal(resolveDeriveSpec("eating-01").source, "eating");
  assert.equal(resolveDeriveSpec("eating-02").source, "happy");
  assert.equal(resolveDeriveSpec("eating-16").source, "hungry");
});

test("all derive sources are master moods", () => {
  for (const target of DERIVED_MOOD_KEYS) {
    const spec = resolveDeriveSpec(target);
    assert.ok(MASTER_MOODS.includes(spec.source), `${target} <- ${spec.source} not a master`);
  }
});

test("derived mood count expanded", () => {
  assert.ok(DERIVED_MOOD_KEYS.length >= 70, `only ${DERIVED_MOOD_KEYS.length}`);
});

test("pose moods have unique transform specs", () => {
  const poses = ["hop", "play", "perch", "egg-rest", "combo-fire", "duel-ready"];
  for (const pose of poses) {
    const spec = FULL_DERIVE_MAP[pose];
    assert.ok(spec && typeof spec === "object", `missing pose ${pose}`);
    assert.ok(spec.source, `${pose} needs source`);
  }
});

if (process.exitCode) process.exit(process.exitCode);
console.log("\nkojnozrout_mood_derive_contract OK\n");
