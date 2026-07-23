"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createMiaEyes } = require("../scripts/MIA_EYES");
const { buildAwayLayoutPlan } = require("../scripts/MIA_OBS_VISION");

test("buildAwayLayoutPlan includes away_loop fullscreen", () => {
  const plan = buildAwayLayoutPlan("tiktok", { width: 1920, height: 1080 });
  assert.ok(plan.away_loop);
  assert.equal(plan.away_loop.enabled, true);
  assert.ok(plan.host_mode);
  assert.ok(plan.viewer_strip);
});

test("scanAwayScene detects loop and required overlays", async () => {
  const png1x1 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  async function obsCall(type, data = {}) {
    switch (type) {
      case "GetCurrentProgramScene":
        return { currentProgramSceneName: "SPINAK_NEJSEM_TU" };
      case "GetInputList":
        return {
          inputs: [
            { inputName: "MIA_AWAY_LOOP", inputKind: "browser_source" },
            { inputName: "MIA_HOST_MODE", inputKind: "browser_source" },
            { inputName: "MIA_ENTITY", inputKind: "browser_source" },
            { inputName: "MIA_VIEWER_STRIP", inputKind: "browser_source" },
            { inputName: "MIA_SPEECH", inputKind: "browser_source" },
            { inputName: "MIA_VOICE", inputKind: "browser_source" }
          ]
        };
      case "GetSceneItemList":
        return {
          sceneItems: [
            { sourceName: "MIA_AWAY_LOOP", sceneItemEnabled: true, sceneItemId: 1 },
            { sourceName: "MIA_HOST_MODE", sceneItemEnabled: true, sceneItemId: 2 },
            { sourceName: "MIA_ENTITY", sceneItemEnabled: true, sceneItemId: 3 },
            { sourceName: "MIA_VIEWER_STRIP", sceneItemEnabled: true, sceneItemId: 4 },
            { sourceName: "MIA_SPEECH", sceneItemEnabled: true, sceneItemId: 5 },
            { sourceName: "MIA_VOICE", sceneItemEnabled: true, sceneItemId: 6 }
          ]
        };
      case "GetInputSettings":
        return {
          inputSettings: {
            url: `http://127.0.0.1:3000/${data.inputName === "MIA_AWAY_LOOP" ? "away-loop-overlay.html" : "x.html"}`
          }
        };
      case "GetSceneItemId":
        return { sceneItemId: 1 };
      case "GetSceneItemEnabled":
        return { sceneItemEnabled: true };
      case "GetSceneItemTransform":
        return { sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 } };
      case "GetSourceScreenshot":
        return { imageData: png1x1 };
      default:
        throw new Error(`unexpected ${type}`);
    }
  }

  const eyes = createMiaEyes({
    safeObsCall: async (type, data) => {
      try {
        const response = await obsCall(type, data);
        return { ok: true, response };
      } catch (err) {
        return { ok: false, reason: err.message };
      }
    },
    appendJsonLog: () => {},
    runtimeConfig: {}
  });

  const report = await eyes.scanAwayScene({ sceneName: "SPINAK_NEJSEM_TU" });
  assert.equal(report.onAwayScene, true);
  assert.equal(report.loopSource, "MIA_AWAY_LOOP");
  assert.equal(report.missingRequired.length, 0);
  assert.ok(Array.isArray(report.overlays));
});
