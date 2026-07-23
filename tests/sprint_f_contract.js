"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  isSelfRestartEnabled,
  shouldRestartAfterHands,
  shouldRestartAfterMediaApply,
  scheduleInProcessRestart,
  isRestartPending
} = require("../scripts/MIA_SELF_RESTART");

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

console.log("\n---- SPRINT F CONTRACT ----\n");

test("package.json restart uses mia_restart.js", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.match(pkg.scripts.restart, /mia_restart\.js/);
});

test("shouldRestartAfterHands detects created sources", () => {
  assert.strictEqual(shouldRestartAfterHands({ created: ["MIA_COMBO"] }), true);
  assert.strictEqual(shouldRestartAfterHands({ ok: true, created: [] }), false);
});

test("shouldRestartAfterMediaApply detects applied slots", () => {
  assert.strictEqual(shouldRestartAfterMediaApply({ applied: ["T1_VIDEO_01"] }), true);
  assert.strictEqual(shouldRestartAfterMediaApply({ applied: [] }), false);
});

test("scheduleInProcessRestart can be disabled", () => {
  const prev = process.env.MIA_SELF_RESTART;
  process.env.MIA_SELF_RESTART = "0";
  const result = scheduleInProcessRestart("test_disabled");
  assert.strictEqual(result.scheduled, false);
  process.env.MIA_SELF_RESTART = prev;
});

test(".env.example documents MIA_SELF_RESTART", () => {
  const env = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
  assert.match(env, /MIA_SELF_RESTART/);
});

test("system routes module registers restart endpoints", () => {
  const systemRoutes = fs.readFileSync(path.join(ROOT, "routes", "system.js"), "utf8");
  assert.match(systemRoutes, /\/system\/obs-hands/);
  assert.match(systemRoutes, /\/system\/restart/);
});

test("index.js wires route packages and restart hooks", () => {
  const index = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
  const bootstrap = fs.readFileSync(
    path.join(ROOT, "scripts", "MIA_SERVER_BOOTSTRAP.js"),
    "utf8"
  );
  const overlaySync = fs.readFileSync(
    path.join(ROOT, "scripts", "MIA_OBS_OVERLAY_SYNC.js"),
    "utf8"
  );
  assert.match(index, /registerAllRoutes/);
  assert.match(index, /buildMiaRouteContext/);
  assert.match(index, /initObsOverlaySyncCoreRuntime/);
  assert.match(index, /ensureObsHands/);
  assert.match(
    overlaySync,
    /maybeScheduleRestartAfterHands/,
    "restart hook lives in OBS overlay sync module"
  );
  assert.match(bootstrap, /isRestartPending/);
});

if (process.exitCode) {
  throw new Error("sprint_f_contract failed");
}
console.log("\nsprint_f_contract OK\n");
