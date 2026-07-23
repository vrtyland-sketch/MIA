"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

console.log("\n---- SPRINT D CONTRACT ----\n");

test(".env.example documents security and engagement vars", () => {
  const env = read(".env.example");
  const required = [
    "MIA_BIND_HOST",
    "MIA_INGEST_SECRET",
    "MIA_DEBUG_ROUTES",
    "MIA_T0_OVERLAY",
    "MIA_T0_FLYBY",
    "MIA_HOST_TEAM_SPLIT_PCT",
    "MIA_GIFT_ECONOMY_TIERS",
    "MIA_STARTUP_CHECK_MS",
    "MIA_PREFLIGHT_ON_START",
    "MIA_VIEWER_STORY_MIN_TIER",
    "MIA_KOJ_WALK_DURATION_MS"
  ];

  for (const key of required) {
    assert.match(env, new RegExp(key));
  }
});

test("KANON alignment references scripts resolver and gift tiers", () => {
  const kanon = read("docs/KANON_MIA_ALIGNMENT.md");
  assert.match(kanon, /scripts\/MIA_SUPPORT_RESOLVER/);
  assert.match(kanon, /MIA_GIFT_TIERS/);
  assert.match(kanon, /MIA_GIFT_PRESENTATION/);
  assert.match(kanon, /MIA_RUNTIME_SECURITY/);
});

test("gift economy doc points to scripts resolver", () => {
  const doc = read("docs/MIA_GIFT_ECONOMY.md");
  assert.match(doc, /scripts\/MIA_SUPPORT_RESOLVER/);
  assert.match(doc, /MIA_GIFT_TIERS/);
});

test("alignment marks host team split and T0 as implemented", () => {
  const kanon = read("docs/KANON_MIA_ALIGNMENT.md");
  assert.match(kanon, /Host team split.*🟢/);
  assert.match(kanon, /T0 interakce.*🟢/);
});
