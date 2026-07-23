"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const sceneEngine = require("../shared/mia-scene-engine");
const immersiveScene = require("../scripts/MIA_IMMERSIVE_SCENE");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");

function testCatalog() {
  const catalog = immersiveScene.getSceneCatalog();
  assert.ok(catalog.ok);
  assert.ok(catalog.environments.length >= 5);
  assert.ok(catalog.creatures.length >= 3);
}

function testDirectorSpaceFromTruckHint() {
  const plan = sceneEngine.resolveSceneFromContext({
    chatText: "jedu kamionem po dalnici",
    irHint: "driving"
  });
  assert.equal(plan.environmentId, "galactic_cruise");
  assert.equal(plan.motionHint, "warp");
  assert.ok(plan.windows.length >= 1);
}

function testDirectorCombatCreature() {
  const plan = sceneEngine.resolveSceneFromContext({
    mode: "combat",
    chatText: "bojovy rezim",
    tier: "T4",
    userId: "streamer_1"
  });
  assert.equal(plan.mode, "combat");
  assert.equal(plan.environmentId, "arena_combat_neon");
  assert.ok(plan.creature);
  assert.ok(plan.creature.creatureId);
  assert.ok(plan.creature.params);
  assert.notEqual(plan.creature.label.toLowerCase(), "predator");
}

function testOverlayStateRoundtrip() {
  const state = overlayState.createOverlayState();
  const applied = immersiveScene.applyImmersiveScene(state, {
    chatText: "hvezdy galaxie a mesic v okne",
    holdMs: 5000
  });
  assert.ok(applied.environmentId);
  const snap = overlayState.getOverlaySnapshot(state);
  assert.ok(snap.immersiveScene);
  assert.equal(snap.immersiveScene.environmentId, "space_cockpit");
  immersiveScene.clearImmersiveScene(state);
  const cleared = overlayState.getImmersiveSceneSnapshot(state);
  assert.equal(cleared, null);
}

function testObsVisionLayoutHook() {
  const obsVision = require("../scripts/MIA_OBS_VISION");
  assert.equal(
    obsVision.resolveLayoutMode({ immersiveScene: { active: true, environmentId: "space_cockpit" } }),
    "immersive_scene"
  );
  assert.ok(
    obsVision.SOURCE_ROLES.some((row) => row.role === "immersive_scene")
  );
}

function testOverlayAssetsExist() {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "immersive-scene-overlay.html"),
    "utf8"
  );
  const js = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "assets", "mia-immersive-scene.js"),
    "utf8"
  );
  assert.match(html, /mia-immersive-scene\.js/);
  assert.match(js, /overlay-state/);
  assert.match(js, /drawStarfield/);
}

function main() {
  testCatalog();
  testDirectorSpaceFromTruckHint();
  testDirectorCombatCreature();
  testOverlayStateRoundtrip();
  testObsVisionLayoutHook();
  testOverlayAssetsExist();
  console.log("mia_phase17_contract: OK");
}

main();
