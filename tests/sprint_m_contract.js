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

console.log("\n---- SPRINT M CONTRACT ----\n");

test("MIA_OBS_VISION module exists", () => {
  const mod = require("../scripts/MIA_OBS_VISION");
  assert.equal(typeof mod.createObsVision, "function");
});

test("MIA_CONFIG exposes obs.vision", () => {
  const { buildRuntimeConfig } = require("../scripts/MIA_CONFIG");
  const cfg = buildRuntimeConfig({ MIA_OBS_VISION: "1" });
  assert.equal(cfg.obs.vision.enabled, true);
});

test("vision dashboard html exists", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "mia-output-overlay", "mia-vision-dashboard.html")));
});

test("obsVision wired and /mia/vision route in eyes package", () => {
  const index = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
  const postConnect = fs.readFileSync(
    path.join(ROOT, "scripts", "MIA_OBS_POST_CONNECT_RUNTIME.js"),
    "utf8"
  );
  const eyes = fs.readFileSync(path.join(ROOT, "routes", "eyes.js"), "utf8");
  assert.match(index, /initObsVision/);
  assert.match(index, /MIA_OBS_VISION_CTX/);
  assert.match(index, /registerAllRoutes/);
  assert.match(eyes, /\/mia\/vision/);
  assert.match(postConnect, /startWatch/);
});

if (process.exitCode) {
  throw new Error("sprint_m_contract failed");
}
console.log("\nsprint_m_contract OK\n");
