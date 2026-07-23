"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  inspectKojnozoutAssets,
  REQUIRED_MOODS,
  ASSETS_ROOT
} = require("../scripts/MIA_KOJNOZROUT_ASSETS");
const { DERIVED_MOOD_KEYS } = require("../scripts/KOJNOZROUT_MOOD_DERIVE");

const MOODS_DIR = path.join(ASSETS_ROOT, "moods");

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

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

console.log("\n---- KOJNOZROUT FULL SPRITE SET CONTRACT ----\n");

test("all mood PNGs exist and vital moods are distinct from idle/hungry copies", () => {
  const report = inspectKojnozoutAssets();
  assert.equal(report.ok, true);

  const idleHash = sha256(path.join(MOODS_DIR, "kojnozout-idle.png"));
  const hungryHash = sha256(path.join(MOODS_DIR, "kojnozout-hungry.png"));

  for (const mood of REQUIRED_MOODS) {
    const filePath = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    assert.ok(fs.existsSync(filePath), `missing ${mood}`);
  }

  assert.notEqual(sha256(path.join(MOODS_DIR, "kojnozout-sleepy.png")), idleHash);
  assert.notEqual(sha256(path.join(MOODS_DIR, "kojnozout-sad.png")), idleHash);
  assert.notEqual(sha256(path.join(MOODS_DIR, "kojnozout-sick.png")), hungryHash);
  assert.notEqual(sha256(path.join(MOODS_DIR, "kojnozout-annoyed.png")), hungryHash);
});

test("derived moods are visually distinct transforms not byte copies", () => {
  const idleHash = sha256(path.join(MOODS_DIR, "kojnozout-idle.png"));
  const samples = ["watch", "hop", "play", "combo-fire", "duel-ready", "egg-rest", "hype-jump"];
  for (const mood of samples) {
    const filePath = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    assert.ok(fs.existsSync(filePath), `missing ${mood}`);
    assert.notEqual(sha256(filePath), idleHash, `${mood} must not be idle copy`);
    assert.ok(fs.statSync(filePath).size > 200000, `${mood} should be canon art`);
  }
});

test("eating variants 01-16 exist", () => {
  for (let i = 1; i <= 16; i += 1) {
    const mood = `eating-${String(i).padStart(2, "0")}`;
    const filePath = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    assert.ok(fs.existsSync(filePath), `missing ${mood}`);
  }
});

test("derived set has high unique hash count", () => {
  const hashes = new Set();
  for (const mood of DERIVED_MOOD_KEYS) {
    const filePath = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    if (!fs.existsSync(filePath)) continue;
    hashes.add(sha256(filePath));
  }
  assert.ok(hashes.size >= 50, `only ${hashes.size} unique derived hashes`);
});

console.log("\n---- KOJNOZROUT FULL SPRITE SET CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
