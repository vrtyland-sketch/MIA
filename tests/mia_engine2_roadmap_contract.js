"use strict";

/**
 * Engine 2.0 roadmap + scaffold contracts  design phase only.
 */

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const { createGameStateStub } = require("../engine2/gamestate-stub");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("architecture and roadmap docs exist with guardrails", () => {
  const arch = fs.readFileSync(
    path.join(ROOT, "docs", "MIA_ENGINE_2_0_ARCHITECTURE.md"),
    "utf8"
  );
  const roadmap = fs.readFileSync(
    path.join(ROOT, "docs", "MIA_ENGINE_2_0_ROADMAP.md"),
    "utf8"
  );
  assert.ok(arch.includes("miaPoints"));
  assert.ok(roadmap.includes("Phase E1"));
  assert.ok(roadmap.includes("rotationIndexByTier"));
  assert.ok(roadmap.includes("TikFinity"));
  assert.ok(roadmap.includes("MIA_ENGINE2_STUB"));
});

test("engine2 scaffold folders present", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "README.md")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "gamestate-stub", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "game-state", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "visibility-engine", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "platform-projection", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "platform-renderer", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "obs-router-boundary", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "event-applicator", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "event-bus-stub", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "overlay-profiles", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "engine2", "plugin-loader", "index.js")));
  assert.ok(fs.existsSync(path.join(ROOT, "game", "hello", "manifest.json")));
});

test("GameState stub returns frozen read-only snapshot", () => {
  const stub = createGameStateStub({
    loaders: {
      loadKoj: () => ({ mood: "calm" }),
      loadWorld: () => ({ mode: "home" })
    }
  });
  const snap = stub.getSnapshot();
  assert.equal(snap.readOnly, true);
  assert.equal(snap.koj.mood, "calm");
  assert.equal(snap.world.mode, "home");
  assert.throws(() => {
    snap.koj = {};
  });
});

test("index.js does not import engine2 directly (admin wiring only)", () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
  assert.ok(!indexSrc.includes("engine2/"));
  assert.ok(!indexSrc.includes("engine2\\"));
});

console.log("mia_engine2_roadmap_contract: all passed");
